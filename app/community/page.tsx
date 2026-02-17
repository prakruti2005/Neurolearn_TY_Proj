"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { CommunityForum } from "@/components/community/community-forum"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp } from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface TagItem {
  id: string
  name: string
  posts?: number
}

export default function CommunityPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

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
      setLoadingTags(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 selection:bg-primary/20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 md:pt-28">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-4xl font-bold">Community Connect</h1>
              <p className="text-lg text-muted-foreground">Collaborate with peers and mentors in an inclusive space.</p>
            </div>
            <CommunityForum />
          </div>

          <aside className="w-full md:w-80 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Trending Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingTags ? (
                  <div className="text-base text-muted-foreground">Loading tags...</div>
                ) : tags.length === 0 ? (
                  <div className="text-base text-muted-foreground">No tags available yet.</div>
                ) : (
                  tags.map((tag) => (
                    <TrendingTag key={tag.id} tag={tag.name} posts={tag.posts} />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Online Mentors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-base font-medium">Prof. Michael Chen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-base font-medium">Dr. Elena Rodriguez</span>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Request Mentorship
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

function TrendingTag({ tag, posts }: { tag: string; posts?: number }) {
  return (
    <div className="flex justify-between items-center text-base p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer group">
      <span className="group-hover:text-primary transition-colors">#{tag}</span>
      <span className="text-muted-foreground text-sm">{posts ?? 0} posts</span>
    </div>
  )
}
