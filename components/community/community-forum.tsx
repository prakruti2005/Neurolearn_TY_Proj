"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, ThumbsUp, Share2, MoreVertical, Send, Loader2 } from "lucide-react"
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface Post {
  id: string
  author: string
  authorId: string
  role: string
  content: string
  timestamp: any 
  likes: number
  replies: number
  tags: string[]
  likedBy?: string[]
}

interface TagItem {
  id: string
  name: string
  posts?: number
}

interface ReplyItem {
  id: string
  author: string
  authorId: string
  role: string
  content: string
  timestamp: any
}

export function CommunityForum() {
  const [newPost, setNewPost] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [tags, setTags] = useState<TagItem[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [repliesByPost, setRepliesByPost] = useState<Record<string, ReplyItem[]>>({})
  const [loadingReplies, setLoadingReplies] = useState(false)

  useEffect(() => {
    // Real-time listener for posts
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts: Post[] = []
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as Post)
      })
      setPosts(fetchedPosts)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tags"), (snapshot) => {
      const fetchedTags: TagItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data() as Record<string, any>
        const name = String(data?.name || data?.label || doc.id)
        fetchedTags.push({
          id: doc.id,
          name,
          posts: typeof data?.posts === "number" ? data.posts : undefined,
        })
      })
      setTags(fetchedTags)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!replyingTo) return

    setLoadingReplies(true)
    const repliesQuery = query(
      collection(db, "posts", replyingTo, "replies"),
      orderBy("timestamp", "asc")
    )

    const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      const fetchedReplies: ReplyItem[] = []
      snapshot.forEach((doc) => {
        fetchedReplies.push({ id: doc.id, ...doc.data() } as ReplyItem)
      })
      setRepliesByPost((prev) => ({ ...prev, [replyingTo]: fetchedReplies }))
      setLoadingReplies(false)
    })

    return () => unsubscribe()
  }, [replyingTo])

  const handlePost = async () => {
    if (!newPost.trim() || !user) return

    setSubmitting(true)
    try {
      await addDoc(collection(db, "posts"), {
        author: userProfile?.displayName || user.email?.split('@')[0] || "Anonymous",
        authorId: user.uid,
        role: userProfile?.role || "student",
        content: newPost,
        timestamp: serverTimestamp(),
        likes: 0,
        replies: 0,
        tags: selectedTags.length > 0 ? selectedTags : ["General"],
      })
      setNewPost("")
      setSelectedTags([])
    } catch (error) {
      console.error("Error adding post: ", error)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Just now"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleToggleLike = async (post: Post) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to like posts." })
      return
    }

    const postRef = doc(db, "posts", post.id)
    const alreadyLiked = post.likedBy?.includes(user.uid)
    try {
      await updateDoc(postRef, {
        likes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      })
    } catch (error) {
      console.error("Error updating like:", error)
      toast({ title: "Action failed", description: "Could not update like." })
    }
  }

  const handleShare = async (post: Post) => {
    const link = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.author}`,
          text: post.content,
          url: link,
        })
      } else {
        await navigator.clipboard.writeText(link)
        toast({ title: "Link copied", description: "Post link copied to clipboard." })
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast({ title: "Share failed", description: "Could not share this post." })
    }
  }

  const handleReply = async (post: Post) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to reply." })
      return
    }

    const replyText = (replyDrafts[post.id] || "").trim()
    if (!replyText) return

    try {
      const repliesRef = collection(db, "posts", post.id, "replies")
      await addDoc(repliesRef, {
        author: userProfile?.displayName || user.email?.split('@')[0] || "Anonymous",
        authorId: user.uid,
        role: userProfile?.role || "student",
        content: replyText,
        timestamp: serverTimestamp(),
      })
      await updateDoc(doc(db, "posts", post.id), {
        replies: increment(1),
      })
      setReplyDrafts((prev) => ({ ...prev, [post.id]: "" }))
      setReplyingTo(null)
    } catch (error) {
      console.error("Error adding reply:", error)
      toast({ title: "Reply failed", description: "Could not post reply." })
    }
  }

  const handleDeletePost = async (post: Post) => {
    if (!user) return
    const canDelete = user.uid === post.authorId || userProfile?.role === "admin"
    if (!canDelete) {
      toast({ title: "Not allowed", description: "You can only delete your own posts." })
      return
    }

    try {
      await deleteDoc(doc(db, "posts", post.id))
      toast({ title: "Post deleted" })
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({ title: "Delete failed", description: "Could not delete this post." })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback>{userProfile?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder={user ? "Share your learning experience..." : "Please sign in to post"}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={!user}
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!user}>
                        Add Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Select tags</DialogTitle>
                        <DialogDescription>
                          Choose one or more tags for your post.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No tags available yet.</span>
                        ) : (
                          tags.map((tag) => (
                            <Button
                              key={tag.id}
                              type="button"
                              size="sm"
                              variant={selectedTags.includes(tag.name) ? "secondary" : "outline"}
                              onClick={() => toggleTag(tag.name)}
                            >
                              {tag.name}
                            </Button>
                          ))
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={() => setTagsOpen(false)}>
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button disabled={!newPost.trim() || submitting || !user} onClick={handlePost}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Post to Forum
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
             <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
        ) : posts.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">No posts yet. Be the first!</div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} id={`post-${post.id}`} className="hover:border-primary/20 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">{post.author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold">{post.author}</CardTitle>
                      <Badge variant="secondary" className="text-xs py-0">
                        {post.role}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">{formatTime(post.timestamp)}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare(post)}>
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeletePost(post)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed mb-4">{post.content}</p>
                <div className="flex gap-2 mb-4">
                  {post.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <button
                      className={`flex items-center gap-1.5 text-sm hover:text-primary transition-colors ${
                        post.likedBy?.includes(user?.uid || "") ? "text-primary" : ""
                      }`}
                      onClick={() => handleToggleLike(post)}
                    >
                      <ThumbsUp className="h-5 w-5" />
                      {post.likes}
                    </button>
                    <button
                      className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                      onClick={() => setReplyingTo((prev) => (prev === post.id ? null : post.id))}
                    >
                      <MessageSquare className="h-5 w-5" />
                      {post.replies}
                    </button>
                  </div>
                  <button
                    className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                    onClick={() => handleShare(post)}
                  >
                    <Share2 className="h-5 w-5" />
                    Share
                  </button>
                </div>
                {replyingTo === post.id && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {loadingReplies ? (
                        <div className="text-xs text-muted-foreground">Loading replies...</div>
                      ) : (repliesByPost[post.id] || []).length === 0 ? (
                        <div className="text-xs text-muted-foreground">No replies yet.</div>
                      ) : (
                        (repliesByPost[post.id] || []).map((reply) => (
                          <div key={reply.id} className="rounded-md border bg-muted/40 p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{reply.author}</span>
                              <Badge variant="secondary" className="text-xs py-0">
                                {reply.role}
                              </Badge>
                              <span className="text-muted-foreground">
                                {formatTime(reply.timestamp)}
                              </span>
                            </div>
                            <p className="mt-1 text-base">{reply.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <Textarea
                      placeholder={user ? "Write a reply..." : "Please sign in to reply"}
                      value={replyDrafts[post.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      className="min-h-[80px] resize-none"
                      disabled={!user}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleReply(post)} disabled={!user}>
                        Reply
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
