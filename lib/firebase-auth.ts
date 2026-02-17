"use client"

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"

export type UserRole = "student" | "teacher" | "admin"

export interface UserProfile {
  uid: string
  email: string
  role: UserRole
  displayName?: string
  createdAt?: any
}

// Sign up new user
export async function signUp(email: string, password: string, role: UserRole, displayName?: string) {
  try {
    // Rule: only students can self-register.
    // Teachers/admins must be created by an admin using server-side Admin SDK.
    if (role !== "student") {
      return { user: null, error: "Only students can register. Teachers are created by an admin." }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user profile in Firestore
    await setDoc(doc(db, "user", user.uid), {
      uid: user.uid,
      email: user.email,
      role: "student",
      displayName: displayName || email.split("@")[0],
      status: "Active",
      createdAt: serverTimestamp(),
    })

    return { user, error: null }
  } catch (error: any) {
    return { user: null, error: error.message }
  }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: error.message }
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth)
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

// Get user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "user", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

// Auth state observer
export function onAuthStateChange(callback: (user: User | null) => void) {
  // Ensure we are in a browser environment
  if (typeof window === "undefined") return () => {}
  return onAuthStateChanged(auth, callback)
}
