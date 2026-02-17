"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { isSupported, getMessaging, onMessage } from "firebase/messaging"
import { app } from "@/lib/firebase"
import { registerPushForCurrentUser } from "@/lib/notifications/push-client"

export function PushNotificationsManager() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Foreground message handler (shows toast)
  useEffect(() => {
    let unsub: (() => void) | null = null

    ;(async () => {
      const supported = await isSupported().catch(() => false)
      if (!supported) return

      try {
        const messaging = getMessaging(app)
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "Notification"
          const description = payload.notification?.body || payload.data?.body || ""
          toast({ title, description })
        })
      } catch {
        // no-op
      }
    })()

    return () => {
      if (unsub) unsub()
    }
  }, [toast])

  // If user already granted notifications, silently register token.
  useEffect(() => {
    if (!user) return
    if (typeof Notification === "undefined") return
    if (Notification.permission !== "granted") return

    ;(async () => {
      const res = await registerPushForCurrentUser(user)
      if (!res.ok) {
        // Keep silent here; user can enable via UI.
        return
      }
    })()
  }, [user])

  return null
}
