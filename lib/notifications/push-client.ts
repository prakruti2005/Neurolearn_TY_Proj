"use client"

import { app, db } from "@/lib/firebase"
import type { User as FirebaseUser } from "firebase/auth"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging"

async function getMessagingIfSupported(): Promise<Messaging | null> {
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  return getMessaging(app)
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null
  if (!("serviceWorker" in navigator)) return null
  return await navigator.serviceWorker.register("/firebase-messaging-sw.js")
}

export async function registerPushForCurrentUser(firebaseUser: FirebaseUser): Promise<
  | { ok: true; token: string }
  | { ok: false; reason: string }
> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    return {
      ok: false,
      reason:
        "Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY. Add it to .env.local to enable web push notifications.",
    }
  }

  const messaging = await getMessagingIfSupported()
  if (!messaging) {
    return {
      ok: false,
      reason:
        "Push notifications are not supported in this browser (or insecure origin). Use HTTPS (or localhost) and a supported browser.",
    }
  }

  const registration = await ensureServiceWorker()
  if (!registration) {
    return {
      ok: false,
      reason: "Service workers are not available. Push notifications require service worker support.",
    }
  }

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (!token) {
      return {
        ok: false,
        reason:
          "No FCM token returned. Make sure notification permission is granted and the VAPID key is correct.",
      }
    }

    await setDoc(
      doc(db, "user", firebaseUser.uid, "fcmTokens", token),
      {
        token,
        createdAt: serverTimestamp(),
        platform: "web",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      },
      { merge: true }
    )

    return { ok: true, token }
  } catch (e: any) {
    return { ok: false, reason: e?.message || "Failed to register for push notifications" }
  }
}
