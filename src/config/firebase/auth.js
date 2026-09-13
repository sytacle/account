import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getAuth,
} from "firebase/auth";
import { app } from "./index.js";

export const auth = getAuth(app);

// OAuth providers used by "Continue with Google/GitHub" on the login
// page, and by the "connect" actions on the Linked accounts screen.
// Both need to be enabled in Firebase Console -> Authentication ->
// Sign-in method for signInWithPopup/linkWithPopup to succeed.
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");
