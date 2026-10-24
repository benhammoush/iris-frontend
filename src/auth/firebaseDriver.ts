/**
 * Firebase adapter for the application authentication-driver contract.
 * @packageDocumentation
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserPopupRedirectResolver,
  setPersistence,
  browserLocalPersistence,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  signOut,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { firebaseConfig } from './config';
import type { AccountDriver, AccountUser } from './session';

/** Map the authenticated Firebase user to the application account contract. */
function profile(user: User | null): AccountUser | null {
  return user
    ? {
        uid: user.uid,
        email: user.email,
        verified: user.emailVerified,
        providers: user.providerData.map((provider) => provider.providerId),
      }
    : null;
}

/** Adapt Firebase authentication to the account driver without exposing provider objects to consumers. */
export async function createFirebaseDriver(): Promise<AccountDriver> {
  const existing = getApps().find((entry) => entry.name === 'iris-accounts');
  const app = existing ?? initializeApp(firebaseConfig, 'iris-accounts');
  // Safari's default resolver eagerly loads Google scripts even for email-only use.
  const auth = existing
    ? getAuth(app)
    : initializeAuth(app, { persistence: browserLocalPersistence });
  await setPersistence(auth, browserLocalPersistence);
  /** Require the currently authenticated Firebase user to match the captured account identity. */
  const requireUser = (uid?: string) => {
    const user = auth.currentUser;
    if (!user || (uid && uid !== user.uid)) throw new Error('AUTH_CHANGED');
    return user;
  };
  /** Create the Google authentication provider used by the account flow. */
  const googleProvider = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  };
  return {
    /** Read the provider's current user through the application-safe identity mapping. */
    current: () => profile(auth.currentUser),
    /** Register a state listener and return cleanup for that subscription. */
    subscribe: (next, error) =>
      onIdTokenChanged(auth, (user) => next(profile(user)), error),
    /** Read an ID token and reject if the authenticated user changed while it was resolving. */
    token: async (uid) => {
      const user = requireUser(uid);
      const token = await user.getIdToken();
      requireUser(uid);
      return token;
    },
    /** Authenticate the email account using the provided credentials. */
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    /** Create the email account through the configured authentication driver. */
    signUp: async (email, password) => {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      requireUser(user.uid);
      const created = profile(user);
      if (!created) throw new Error('AUTH_CHANGED');
      return created;
    },
    /** Authenticate through the configured Google account flow. */
    google: async () => {
      await signInWithPopup(
        auth,
        googleProvider(),
        browserPopupRedirectResolver,
      );
    },
    /** Request password recovery for the supplied email address. */
    reset: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    /** Request verification for the current authenticated email account. */
    verify: async () => {
      await sendEmailVerification(requireUser());
    },
    /** Refresh the currently scoped resource without accepting results from a superseded identity. */
    refresh: async () => {
      const user = requireUser();
      await reload(user);
      requireUser(user.uid);
      await user.getIdToken(true);
      requireUser(user.uid);
      return profile(user);
    },
    /** Link Google credentials to the current account with the required reauthentication. */
    linkGoogle: async (password) => {
      const user = requireUser();
      if (!user.email) throw new Error('AUTH_CHANGED');
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, password),
      );
      requireUser(user.uid);
      await linkWithPopup(user, googleProvider(), browserPopupRedirectResolver);
      requireUser(user.uid);
    },
    /** Link password credentials to the current account without switching its identity. */
    linkPassword: async (password) => {
      const user = requireUser();
      if (!user.email) throw new Error('AUTH_CHANGED');
      const email = user.email;
      await reauthenticateWithPopup(
        user,
        googleProvider(),
        browserPopupRedirectResolver,
      );
      requireUser(user.uid);
      await linkWithCredential(
        user,
        EmailAuthProvider.credential(email, password),
      );
      requireUser(user.uid);
    },
    /** End the current authentication session and invalidate identity-bound work. */
    signOut: () => signOut(auth),
  };
}
