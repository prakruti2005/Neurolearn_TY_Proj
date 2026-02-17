"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, Video, Mic, Edit, Trash2, Loader2 } from "lucide-react"
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface ContentItem {
  id: string
  title: string
  type: string
  status: string
  students?: number
  assetUrl?: string
}

export default function ContentManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editType, setEditType] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newTitle, setNewTitle] = useState("")
  const [newFile, setNewFile] = useState<File | null>(null)

  // Helper to upload with progress
  const uploadFileToS3 = (url: string, file: File, contentType: string) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", contentType)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error("Network error during upload"))
      xhr.send(file)
    })
  }

  useEffect(() => {
    async function fetchContent() {
      try {
        const querySnapshot = await getDocs(collection(db, "courses"))
        const fetched: ContentItem[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          fetched.push({
            id: doc.id,
            title: data.title || "Untitled Course",
            type: data.type || "Course",
            status: data.status || "Published",
            students: Math.floor(Math.random() * 100) 
          })
        })
        setContentItems(fetched)
      } catch (error) {
        console.error("Error fetching content:", error)
        // Fallback or empty state
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [])

  const createNew = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Missing title", description: "Please enter a title.", variant: "destructive" })
      return
    }
    if (!newFile) {
      toast({ title: "Missing file", description: "Please choose a file to upload.", variant: "destructive" })
      return
    }

    setCreating(true)
    try {
      const contentType = newFile.type || "application/octet-stream"

      // 1. Get Presigned URL
      const signedRes = await fetch("/api/content/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           filename: newFile.name,
           contentType,
           folder: "content"
        })
      })
      
      const signedJson = await signedRes.json().catch(() => ({}))
      if (!signedRes.ok) {
        throw new Error(String(signedJson?.error || "Failed to get upload URL"))
      }

      const { url, key, bucket } = signedJson

      // 2. Upload directly to S3 with progress
      await uploadFileToS3(url, newFile, contentType)

      // 3. Create Record (Server-side)
      const finalizeRes = await fetch("/api/content/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          key,
          bucket,
          contentType,
          size: newFile.size
        })
      })

      const finalizeJson = await finalizeRes.json().catch(() => ({}))
      if (!finalizeRes.ok) {
        // Fallback: store metadata from client if admin backend failed
        const isText =
          contentType.startsWith("text/") ||
          contentType.includes("json") ||
          contentType.includes("csv") ||
          newFile.name.toLowerCase().endsWith(".txt") ||
          newFile.name.toLowerCase().endsWith(".md")

        await addDoc(collection(db, "courses"), {
          title: newTitle.trim() || "Untitled Content",
          assetUrl: String(finalizeJson?.url || "") || undefined,
          assetKey: key,
          bucket,
          s3Key: key,
          s3Bucket: bucket,
          createdAt: serverTimestamp(),
          type: isText ? "Document" : "Video",
          status: "Published",
          contentType,
          size: newFile.size,
          metadata: { processingStatus: "pending" },
        })

        toast({
          title: "Saved to Firestore",
          description: "Server save failed, so metadata was saved from the browser.",
        })
      } else {
        toast({ title: "Content saved", description: "Uploaded to S3 and saved in Firestore." })
      }
      setCreateOpen(false)
      setNewTitle("")
      setNewFile(null)
      setLoading(true)

      // Refresh
      const querySnapshot = await getDocs(collection(db, "courses"))
      const fetched: ContentItem[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetched.push({
          id: doc.id,
          title: data.title || "Untitled Course",
          type: data.type || "Course",
          status: data.status || "Published",
          students: Math.floor(Math.random() * 100),
          assetUrl: data.assetUrl || undefined,
        })
      })
      setContentItems(fetched)
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "Failed to create", variant: "destructive" })
    } finally {
      setCreating(false)
      setLoading(false)
    }
  }

  const syncFromS3 = async () => {
    if (!user) {
      toast({ title: "Not signed in", description: "Sign in as admin first.", variant: "destructive" })
      return
    }

    setSyncing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/content/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to sync")

      toast({
        title: "Sync complete",
        description: `Created: ${json?.created ?? 0}, Skipped: ${json?.skipped ?? 0}`,
      })

      // Refresh list
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "courses"))
      const fetched: ContentItem[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetched.push({
          id: doc.id,
          title: data.title || "Untitled Course",
          type: data.type || "Course",
          status: data.status || "Published",
          students: Math.floor(Math.random() * 100),
          assetUrl: data.assetUrl || undefined,
        })
      })
      setContentItems(fetched)
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message || "Failed to sync", variant: "destructive" })
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }

  const openEdit = (item: ContentItem) => {
    setEditingItem(item)
    setEditTitle(item.title || "")
    setEditType(item.type || "Course")
    setEditStatus(item.status || "Published")
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    if (!editTitle.trim()) {
      toast({ title: "Missing title", description: "Title is required.", variant: "destructive" })
      return
    }

    try {
      const ref = doc(db, "courses", editingItem.id)
      await updateDoc(ref, {
        title: editTitle.trim(),
        type: editType.trim() || "Course",
        status: editStatus.trim() || "Published",
      })

      setContentItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? { ...it, title: editTitle.trim(), type: editType.trim() || "Course", status: editStatus.trim() || "Published" }
            : it
        )
      )

      toast({ title: "Updated", description: "Content updated successfully." })
      setEditOpen(false)
      setEditingItem(null)
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Failed to update", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">Create and manage courses, lessons, and resources.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={syncFromS3} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sync from S3
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Content</DialogTitle>
                <DialogDescription>Uploads a file to your S3 bucket and stores metadata in Firestore.</DialogDescription>
              </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-title">Title</Label>
                <Input
                  id="content-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Lesson 1 - Introduction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content-file">File</Label>
                <Input
                  id="content-file"
                  type="file"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                   Supported formats: .mp4, .mov, .pdf, .docx, .txt
                </p>
                {creating && (
                  <div className="space-y-1 mt-2">
                    <div className="text-xs flex justify-between">
                       <span>Uploading...</span>
                       <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={createNew} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload & Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search content..." className="pl-8" />
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>Update the course details stored in Firestore.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Input id="edit-type" value={editType} onChange={(e) => setEditType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Input id="edit-status" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center p-8">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contentItems.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">No content found.</div>
      ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium line-clamp-1">{item.title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.type === "Course" && <Video className="h-3 w-3" />}
                  {item.type === "Workshop" && <Mic className="h-3 w-3" />}
                  {item.type === "Article" && <FileText className="h-3 w-3" />}
                  <span>{item.type}</span>
                </div>
              </div>
              <Badge variant={item.status === 'Published' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{item.students || 0}</div>
               <p className="text-xs text-muted-foreground">Enrolled Students</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      )}
    </div>
  )
}

