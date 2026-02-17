"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { EnablePushCard } from "@/components/notifications/enable-push-card"

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pushTitle, setPushTitle] = useState("NeuroLearn Update")
  const [pushBody, setPushBody] = useState("New content is available. Check your dashboard.")
  const [pushTargetUid, setPushTargetUid] = useState("")
  const [sending, setSending] = useState(false)

  const canSend = useMemo(() => pushTitle.trim() && pushBody.trim(), [pushTitle, pushBody])

  const sendPush = async () => {
    if (!user) {
      toast({ title: "Not signed in", description: "Sign in as admin first.", variant: "destructive" })
      return
    }

    if (!canSend) {
      toast({ title: "Missing fields", description: "Title and body are required.", variant: "destructive" })
      return
    }

    setSending(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: pushTitle.trim(),
          body: pushBody.trim(),
          uid: pushTargetUid.trim() || undefined,
          broadcast: !pushTargetUid.trim(),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to send")

      toast({
        title: "Push sent",
        description: `Success: ${json?.successCount ?? 0}, Failed: ${json?.failureCount ?? 0}`,
      })
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message || "Failed to send", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage platform configuration and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility Defaults</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
              <CardDescription>Basic details about the NeuroLearn instance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Platform Name</Label>
                <Input id="site-name" defaultValue="NeuroLearn Platform" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Support Email</Label>
                <Input id="contact-email" defaultValue="support@neurolearn.ai" />
              </div>
              <div className="flex items-center justify-between py-2">
                 <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">Disable user access for updates</p>
                 </div>
                 <Switch />
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Defaults</CardTitle>
              <CardDescription>Global settings for AI accessibility features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between py-2 border-b">
                 <div className="space-y-0.5">
                    <Label>Auto-Enable Captions</Label>
                    <p className="text-xs text-muted-foreground">Default for new video content</p>
                 </div>
                 <Switch defaultChecked />
              </div>
               <div className="flex items-center justify-between py-2 border-b">
                 <div className="space-y-0.5">
                    <Label>Sign Language Avatar</Label>
                    <p className="text-xs text-muted-foreground">Enable AI avatar generation by default</p>
                 </div>
                 <Switch defaultChecked />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Default Text-to-Speech Voice</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                   <option value="joanna">Joanna (US English)</option>
                   <option value="matthew">Matthew (US English)</option>
                   <option value="aditi">Aditi (Indian English)</option>
                </select>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
               <Button>Update Defaults</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
           <Card>
             <CardHeader>
               <CardTitle>Notification Channels</CardTitle>
               <CardDescription>Configure how users receive alerts.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center justify-between py-2">
                  <Label>Email Notifications</Label>
                  <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between py-2">
                  <Label>Push Notifications (Mobile)</Label>
                  <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between py-2">
                  <Label>SMS Alerts (Critical)</Label>
                  <Switch />
               </div>
             </CardContent>
           </Card>

           <div className="mt-6">
             <EnablePushCard />
             <p className="mt-2 text-xs text-muted-foreground">
               To send to a specific user, that user must enable push notifications on their own device first (it registers an FCM token in Firestore).
             </p>
           </div>

           <Card className="mt-6">
             <CardHeader>
               <CardTitle>Send Push Notification</CardTitle>
               <CardDescription>
                 Sends a web push via Firebase Cloud Messaging. If UID is empty, it broadcasts to all registered devices.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="push-title">Title</Label>
                 <Input id="push-title" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="push-body">Body</Label>
                 <Input id="push-body" value={pushBody} onChange={(e) => setPushBody(e.target.value)} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="push-uid">Target UID (optional)</Label>
                 <Input
                   id="push-uid"
                   value={pushTargetUid}
                   onChange={(e) => setPushTargetUid(e.target.value)}
                   placeholder="Leave empty to broadcast"
                 />
               </div>
             </CardContent>
             <CardFooter className="justify-end border-t pt-4">
               <Button onClick={sendPush} disabled={sending || !canSend}>
                 {sending ? "Sending..." : "Send Push"}
               </Button>
             </CardFooter>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
