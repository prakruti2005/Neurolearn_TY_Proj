"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send } from "lucide-react"

export default function AdminNotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [uid, setUid] = useState("")
  const [broadcast, setBroadcast] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({ title: "Not signed in", description: "Sign in as admin first.", variant: "destructive" })
      return
    }
    
    if (!title || !body) {
      toast({ title: "Validation Error", description: "Title and Body are required", variant: "destructive" })
      return
    }

    if (!broadcast && !uid) {
      toast({ title: "Validation Error", description: "UID is required if not broadcasting", variant: "destructive" })
      return
    }

    setSending(true)
    try {
      const token = await user.getIdToken()
      if (!token) {
        throw new Error("Failed to retrieve a valid ID token. Please sign in again.")
      }
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          body,
          uid: broadcast ? undefined : uid,
          broadcast
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send notification")
      }

      if (data?.warning || data?.tokens === 0) {
        toast({
          title: "No devices registered",
          description: data?.warning || "No push tokens found. Ensure users enabled notifications and a VAPID key is set.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Notification Sent",
          description: `Successfully sent to ${data.successCount} devices (Failed: ${data.failureCount})`,
        })
      }

      // Reset form
      setTitle("")
      setBody("")
      setUid("")
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      })
    } finally {
      setSending(false)
    }
  }

  if (authLoading) return <div className="p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-muted-foreground">Send real-time alerts to users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>
            Send push notifications and alerts to users. Messages are also saved to their history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. New Course Available" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Message Body</Label>
              <Textarea 
                id="body" 
                placeholder="Enter notification content..." 
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch 
                id="broadcast" 
                checked={broadcast}
                onCheckedChange={setBroadcast}
              />
              <Label htmlFor="broadcast">Broadcast to All Users</Label>
            </div>

            {!broadcast && (
              <div className="space-y-2">
                <Label htmlFor="uid">Target User ID</Label>
                <Input 
                  id="uid" 
                  placeholder="User UID" 
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send Notification
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
