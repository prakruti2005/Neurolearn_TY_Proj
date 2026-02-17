"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { registerPushForCurrentUser } from "@/lib/notifications/push-client"

export function EnablePushCard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const status = useMemo(() => {
    if (typeof Notification === "undefined") return "unsupported"
    return Notification.permission
  }, [])

  const enable = async () => {
    if (!user) {
      toast({ title: "Not signed in", description: "Sign in to enable push notifications.", variant: "destructive" })
      return
    }

    if (typeof Notification === "undefined") {
      toast({ title: "Not supported", description: "This browser does not support notifications.", variant: "destructive" })
      return
    }

    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in your browser settings." })
        return
      }

      const res = await registerPushForCurrentUser(user)
      if (!res.ok) {
        toast({ title: "Push not enabled", description: res.reason, variant: "destructive" })
        return
      }

      toast({ title: "Push enabled", description: "This device is now registered for notifications." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>Enable real-time alerts for lessons and discussions.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Status: {status === "granted" ? "Enabled" : status === "denied" ? "Blocked" : "Not enabled"}
        </div>
        <Button onClick={enable} disabled={busy || status === "granted"}>
          {status === "granted" ? "Enabled" : busy ? "Enabling..." : "Enable"}
        </Button>
      </CardContent>
    </Card>
  )
}
