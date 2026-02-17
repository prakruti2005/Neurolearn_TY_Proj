"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChange, getUserProfile, type UserProfile } from "@/lib/firebase-auth"
import { doc, serverTimestamp, setDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] Setting up auth state change listener")
    let unsubscribeProfile: (() => void) | null = null

    const unsubscribeAuth = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)

      // Always unsubscribe from previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile()
        unsubscribeProfile = null
      }

      if (firebaseUser) {
        console.log("[v0] User authenticated, setting up real-time profile listener:", firebaseUser.uid)

        // Initial check to create profile if missing
        let profile = await getUserProfile(firebaseUser.uid)
        if (!profile) {
          try {
            await setDoc(
              doc(db, "user", firebaseUser.uid),
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: "student",
                displayName:
                  firebaseUser.displayName ||
                  (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Student"),
                status: "Active",
                createdAt: serverTimestamp(),
              },
              { merge: true }
            )
          } catch (e) {
            console.error("[v0] Failed to auto-create user profile:", e)
          }
        }

        // Real-time listener for profile changes (role, display name updates)
        unsubscribeProfile = onSnapshot(doc(db, "user", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
             const data = docSnap.data() as UserProfile
             setUserProfile(data)
             // Force verify role from Firestore data
             console.log(`[v0] Verified User Role: ${data.role}`)
          } else {
             setUserProfile(null)
          }
        })
      } else {
        console.log("[v0] No user authenticated")
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeProfile) unsubscribeProfile()
    }
  }, [])

  return <AuthContext.Provider value={{ user, userProfile, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
