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

export async function createFirebaseDriver(): Promise<AccountDriver> {
  const existing = getApps().find((entry) => entry.name === 'iris-accounts');
  const app = existing ?? initializeApp(firebaseConfig, 'iris-accounts');
  // Safari's default resolver eagerly loads Google scripts even for email-only use.
  const auth = existing
    ? getAuth(app)
    : initializeAuth(app, { persistence: browserLocalPersistence });
  await setPersistence(auth, browserLocalPersistence);
  const requireUser = (uid?: string) => {
    const user = auth.currentUser;
    if (!user || (uid && uid !== user.uid)) throw new Error('AUTH_CHANGED');
    return user;
  };
  const googleProvider = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  };
  return {
    current: () => profile(auth.currentUser),
    subscribe: (next, error) =>
      onIdTokenChanged(auth, (user) => next(profile(user)), error),
    token: async (uid) => {
      const user = requireUser(uid);
      const token = await user.getIdToken();
      requireUser(uid);
      return token;
    },
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
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
    google: async () => {
      await signInWithPopup(
        auth,
        googleProvider(),
        browserPopupRedirectResolver,
      );
    },
    reset: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    verify: async () => {
      await sendEmailVerification(requireUser());
    },
    refresh: async () => {
      const user = requireUser();
      await reload(user);
      requireUser(user.uid);
      await user.getIdToken(true);
      requireUser(user.uid);
      return profile(user);
    },
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
    signOut: () => signOut(auth),
  };
}
