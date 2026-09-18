import crypto from "node:crypto";
import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, FieldValue } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";
import { requirePasskeyVerification } from "./passkeys.js";

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const STORAGE_LIMITS = {
  free: 250 * 1024 * 1024,
  pro: 1024 * 1024 * 1024,
  business: 5 * 1024 * 1024 * 1024,
};
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function r2() {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET)
    throw new ApiError("storage_not_configured", "Cloudflare R2 storage is not configured.", 503);
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

function filesRef(uid) {
  return db.collection("users").doc(uid).collection("storage").doc("files").collection("items");
}

function summaryRef(uid) {
  return db.collection("users").doc(uid).collection("storage").doc("summary");
}

async function adjustSummary(uid, fileDelta, byteDelta) {
  await db.runTransaction(async (transaction) => {
    const summary = await transaction.get(summaryRef(uid));
    const data = summary.exists ? summary.data() : {};
    transaction.set(summaryRef(uid), {
      totalFiles: Math.max(0, Number(data.totalFiles || 0) + fileDelta),
      totalBytes: Math.max(0, Number(data.totalBytes || 0) + byteDelta),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

function storageLimit(subscription) {
  return STORAGE_LIMITS[subscription] || STORAGE_LIMITS.free;
}

async function assertUploadWithinLimit(uid, subscription, size) {
  const summary = await summaryRef(uid).get();
  const totalBytes = Number(summary.data()?.totalBytes || 0);
  if (totalBytes + size > storageLimit(subscription))
    throw new ApiError("storage_limit_reached", "Your plan storage limit has been reached.", 413);
}

async function completeFile(uid, id, file, key, subscription) {
  const ref = filesRef(uid).doc(id);
  await db.runTransaction(async (transaction) => {
    const summary = await transaction.get(summaryRef(uid));
    const existing = await transaction.get(ref);
    if (existing.exists) throw new ApiError("invalid_request", "Upload has already been completed.", 409);
    const data = summary.exists ? summary.data() : {};
    const totalBytes = Number(data.totalBytes || 0);
    if (totalBytes + file.size > storageLimit(subscription))
      throw new ApiError("storage_limit_reached", "Your plan storage limit has been reached.", 413);
    transaction.create(ref, {
      name: file.name,
      key,
      provider: "r2",
      contentType: file.contentType,
      size: file.size,
      publicUrl: process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(summaryRef(uid), {
      totalFiles: Math.max(0, Number(data.totalFiles || 0) + 1),
      totalBytes: totalBytes + file.size,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return ref;
}

function serializeFile(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    key: data.key,
    provider: data.provider,
    contentType: data.contentType,
    size: Number(data.size || 0),
    createdAt: data.createdAt?.toDate?.().toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
    publicUrl: data.publicUrl || null,
  };
}

function validateFile(body) {
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 180) : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const size = Number(body?.size);
  if (!name || !contentType || !Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES)
    throw new ApiError("invalid_request", "A valid file name, type, and size are required.", 400);
  return { name, contentType, size };
}

export async function listFiles(req, res) {
  const token = await verifyBearerToken(req);
  const [snapshot, summary] = await Promise.all([filesRef(token.uid).orderBy("createdAt", "desc").get(), summaryRef(token.uid).get()]);
  const data = summary.exists ? summary.data() : {};
  return send(res, 200, {
    files: snapshot.docs.map(serializeFile),
    totalFiles: Number(data.totalFiles || snapshot.size),
    totalBytes: Number(data.totalBytes || snapshot.docs.reduce((total, doc) => total + Number(doc.data().size || 0), 0)),
  });
}

export async function createUploadUrl(req, res) {
  const token = await requirePasskeyVerification(req);
  const file = validateFile(req.body);
  await assertUploadWithinLimit(token.uid, token.subscription, file.size);
  const client = r2();
  const id = crypto.randomUUID();
  const key = `${token.uid}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: file.contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
  return send(res, 200, { fileId: id, key, uploadUrl, expiresIn: 900 });
}

export async function completeUpload(req, res) {
  const token = await verifyBearerToken(req);
  const file = validateFile(req.body);
  const id = String(req.body?.fileId || "");
  const key = String(req.body?.key || "");
  if (!id || !key.startsWith(`${token.uid}/`)) throw new ApiError("invalid_request", "Invalid upload reference.", 400);
  const object = await r2().send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  if (Number(object.ContentLength || 0) !== file.size || object.ContentType !== file.contentType)
    throw new ApiError("invalid_request", "Uploaded file metadata does not match the object.", 400);
  const ref = await completeFile(token.uid, id, file, key, token.subscription);
  return send(res, 201, { file: serializeFile(await ref.get()) });
}

export async function downloadFile(req, res) {
  const token = await verifyBearerToken(req);
  const ref = filesRef(token.uid).doc(String(req.params.fileId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ApiError("not_found", "File not found.", 404);
  const client = r2();
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: snapshot.data().key }), { expiresIn: 900 });
  return send(res, 200, { url, expiresIn: 900 });
}

export async function deleteFile(req, res) {
  const token = await requirePasskeyVerification(req);
  const ref = filesRef(token.uid).doc(String(req.params.fileId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ApiError("not_found", "File not found.", 404);
  const data = snapshot.data();
  if (data.provider === "cloudinary") {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    await cloudinary.uploader.destroy(data.key, { resource_type: "image" });
  } else {
    await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: data.key }));
  }
  await ref.delete();
  await adjustSummary(token.uid, -1, -Number(data.size || 0));
  return send(res, 200, { ok: true });
}

export async function createCloudinarySignature(req, res) {
  const token = await requirePasskeyVerification(req);
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) throw new ApiError("storage_not_configured", "Cloudinary is not configured.", 503);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `sytacle/users/${token.uid}/profile`;
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return send(res, 200, { cloudName, apiKey, timestamp, folder, signature });
}

export async function completeCloudinaryProfileImage(req, res) {
  const token = await verifyBearerToken(req);
  const url = typeof req.body?.secureUrl === "string" ? req.body.secureUrl.trim() : "";
  const publicId = typeof req.body?.publicId === "string" ? req.body.publicId.trim() : "";
  if (!url || !publicId || !url.startsWith("https://res.cloudinary.com/")) throw new ApiError("invalid_request", "Invalid Cloudinary image.", 400);
  await authUpdateProfile(token.uid, url);
  const ref = filesRef(token.uid).doc("profile-image");
  const previous = await ref.get();
  const size = Number(req.body?.bytes || 0);
  const previousSize = Number(previous.data()?.size || 0);
  await assertUploadWithinLimit(token.uid, token.subscription, Math.max(0, size - previousSize));
  await ref.set({ name: "Profile image", key: publicId, provider: "cloudinary", contentType: "image", size: Number(req.body?.bytes || 0), publicUrl: url, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await adjustSummary(token.uid, previous.exists ? 0 : 1, size - previousSize);
  return send(res, 200, { photoURL: url });
}

async function authUpdateProfile(uid, photoURL) {
  const { auth } = await import("../firebase.js");
  await auth.updateUser(uid, { photoURL });
  await db.collection("users").doc(uid).set({ photoURL, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export { allowedImageTypes };
