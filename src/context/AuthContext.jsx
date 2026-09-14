import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  multiFactor,
  createUserWithEmailAndPassword,
  linkWithPopup,
  getAdditionalUserInfo,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  unlink,
  updateProfile,
} from "firebase/auth";
import { auth, githubProvider, googleProvider } from "../config/firebase/auth.js";
import { registerDeviceSession } from "../lib/accountApi.js";
import {
  ensureUserProfile,
  subscribeToUserProfile,
  updateUserProfileDoc,
} from "../lib/userProfile.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Track the signed-in Firebase user.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) setProfile(null);
      else registerDeviceSession(nextUser).catch((err) => console.warn("Unable to register device session:", err));
    });
    return unsubscribe;
  }, []);

  // Once we have a user, make sure their Firestore profile doc exists
  // and keep it live-synced (so edits from any tab/device show up).
  useEffect(() => {
    if (!user) return undefined;
    let unsubscribeSnapshot = () => {};
    let cancelled = false;

    setProfileLoading(true);
    ensureUserProfile(user)
      .then(() => {
        if (cancelled) return;
        unsubscribeSnapshot = subscribeToUserProfile(user.uid, (data) => {
          setProfile(data);
          setProfileLoading(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load account profile:", err);
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribeSnapshot();
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading: authLoading || (Boolean(user) && profileLoading && !profile),
      isAuthenticated: Boolean(user),

      async signUpWithEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        await sendEmailVerification(cred.user);
        return cred.user;
      },

      async signInWithEmail(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      },

      async sendPasswordlessSignInLink(email, continueUrl) {
        await sendSignInLinkToEmail(auth, email, {
          url: continueUrl,
          handleCodeInApp: true,
        });
      },

      async completePasswordlessSignIn(email, emailLink) {
        if (!isSignInWithEmailLink(auth, emailLink)) {
          throw new Error("This sign-in link is invalid or has expired.");
        }
        const credential = await signInWithEmailLink(auth, email, emailLink);
        const profile = await ensureUserProfile(credential.user);
        return {
          user: credential.user,
          isNewUser: getAdditionalUserInfo(credential)?.isNewUser ?? false,
          profile,
        };
      },

      async signInWithGoogle() {
        const cred = await signInWithPopup(auth, googleProvider);
        return cred.user;
      },

      async signInWithGithub() {
        const cred = await signInWithPopup(auth, githubProvider);
        return cred.user;
      },

      async sendReset(email) {
        await sendPasswordResetEmail(auth, email);
      },

      async resendVerificationEmail() {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      },

      async enrollSmsMfa(phoneNumber, verificationCode) {
        if (!auth.currentUser) throw new Error("Not signed in");
        if (!verificationCode) {
          const verifier = new RecaptchaVerifier(auth, "mfa-recaptcha", { size: "invisible" });
          const session = await multiFactor(auth.currentUser).getSession();
          const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({ phoneNumber, session }, verifier);
          return { verificationId, verifier };
        }
        throw new Error("A verification session is required.");
      },

      async confirmSmsMfa(verificationId, verificationCode, verifier) {
        if (!auth.currentUser) throw new Error("Not signed in");
        const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
        await multiFactor(auth.currentUser).enroll(PhoneMultiFactorGenerator.assertion(credential), "SMS");
        verifier?.clear();
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
      },

      async unenrollMfa(factorUid) {
        if (!auth.currentUser) throw new Error("Not signed in");
        await multiFactor(auth.currentUser).unenroll(factorUid);
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
      },

      async signOutUser() {
        await signOut(auth);
      },

      /** Updates Auth profile fields (name/photo) and mirrors editable
       *  extras (phone/birthday) into the Firestore profile doc. */
      async saveProfile({ displayName, photoURL, phone, birthday }) {
        if (!auth.currentUser) throw new Error("Not signed in");
        if (displayName !== undefined || photoURL !== undefined) {
          await updateProfile(auth.currentUser, {
            ...(displayName !== undefined ? { displayName } : {}),
            ...(photoURL !== undefined ? { photoURL } : {}),
          });
          // updateProfile doesn't trigger onAuthStateChanged; refresh
          // our local copy so the UI reflects the new name immediately.
          setUser({ ...auth.currentUser });
        }
        const docPatch = {};
        if (phone !== undefined) docPatch.phone = phone;
        if (birthday !== undefined) docPatch.birthday = birthday;
        if (Object.keys(docPatch).length) {
          await updateUserProfileDoc(auth.currentUser.uid, docPatch);
        }
      },

      async linkGoogle() {
        if (!auth.currentUser) throw new Error("Not signed in");
        await linkWithPopup(auth.currentUser, googleProvider);
        setUser({ ...auth.currentUser });
      },

      async linkGithub() {
        if (!auth.currentUser) throw new Error("Not signed in");
        await linkWithPopup(auth.currentUser, githubProvider);
        setUser({ ...auth.currentUser });
      },

      async unlinkProvider(providerId) {
        if (!auth.currentUser) throw new Error("Not signed in");
        if (auth.currentUser.providerData.length < 2) {
          throw new Error(
            "You need at least one sign-in method connected — link another before removing this one."
          );
        }
        await unlink(auth.currentUser, providerId);
        setUser({ ...auth.currentUser });
      },

      async updateNotificationPref(key, value) {
        if (!auth.currentUser) throw new Error("Not signed in");
        await updateUserProfileDoc(auth.currentUser.uid, {
          notifications: { ...(profile?.notifications || {}), [key]: value },
        });
      },

      async updatePrivacyPref(key, value) {
        if (!auth.currentUser) throw new Error("Not signed in");
        await updateUserProfileDoc(auth.currentUser.uid, {
          privacy: { ...(profile?.privacy || {}), [key]: value },
        });
      },
    }),
    [user, profile, authLoading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
