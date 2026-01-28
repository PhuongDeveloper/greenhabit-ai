"use client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { getAuth } from "./firebase";
import { createUserIfNotExists, getUserByUid } from "./db";

export async function signIn(email: string, password: string) {
  const auth = getAuth();
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string, displayName?: string) {
  const auth = getAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // ensure user doc exists
  const user = cred.user;
  await createUserIfNotExists(user.uid, user.email ?? "", displayName ?? "", "");
  return cred;
}

export async function signOut() {
  const auth = getAuth();
  return await firebaseSignOut(auth);
}

export function onAuthStateChangedListener(callback: (user: FirebaseUser | null) => void) {
  const auth = getAuth();
  return firebaseOnAuthStateChanged(auth, async (user) => {
    if (user) {
      // ensure user doc exists
      await createUserIfNotExists(user.uid, user.email ?? "", user.displayName ?? "", user.photoURL ?? "");
    }
    callback(user);
  });
}

export async function getCurrentUserProfile() {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) return null;
  return await getUserByUid(u.uid);
}


