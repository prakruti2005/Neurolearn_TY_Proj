"use client"

import { Navbar } from "@/components/layout/navbar"
import { CoursePlayer } from "@/components/learning/course-player"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

export default function CourseDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const courseId = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoResolveError, setVideoResolveError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) return
      try {
        // Load from Firestore courses collection
        const docRef = doc(db, "courses", courseId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() })
        } else {
          console.error("No such course!")
        }
      } catch (error) {
        console.error("Error fetching course:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  useEffect(() => {
    async function resolveVideoUrl() {
      if (!course) return

      setVideoResolveError(null)

      const key = String(course.assetKey || "").trim()
      const fallbackUrl = String(course.assetUrl || course.videoUrl || "").trim()

      // Prefer signed URL when we have an S3 key.
      if (key) {
        try {
          setVideoLoading(true)
          const res = await fetch(`/api/content/signed-url?key=${encodeURIComponent(key)}`)
          const json = await res.json().catch(() => ({}))
          if (res.ok && json?.url) {
            setVideoUrl(String(json.url))
            return
          }

          // Signed URL failed (likely missing s3:GetObject or wrong key)
          const awsName = String(json?.awsError?.name || "").trim()
          const awsStatus = json?.awsError?.statusCode
          const extra = awsName ? ` (${awsName}${awsStatus ? ` ${awsStatus}` : ""})` : ""
          setVideoResolveError(String(json?.error || "Failed to create signed URL") + extra)
        } catch (e) {
          console.error("Failed to resolve signed URL", e)
          setVideoResolveError(e instanceof Error ? e.message : "Failed to resolve video URL")
        } finally {
          setVideoLoading(false)
        }
      }

      if (!key && !fallbackUrl) {
        setVideoResolveError("This course has no uploaded video yet (missing assetKey/assetUrl). Upload a file in Admin → Content.")
      }

      setVideoUrl(fallbackUrl || null)
    }

    resolveVideoUrl()
  }, [course])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
        <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
            Course not found
        </div>
      </div>
    )
  }

  // Map course data to lesson format. If lessons exist, use the first lesson,
  // but still fall back to the course-level uploaded asset.
  const currentLesson = course.lessons && course.lessons.length > 0
    ? {
        ...course.lessons[0],
        title: course.lessons[0]?.title || course.title,
        content: course.lessons[0]?.content || course.description,
        videoUrl: course.lessons[0]?.videoUrl || videoUrl || undefined,
        assetKey: String(course.lessons[0]?.assetKey || course.assetKey || "").trim() || undefined,
        bucket: String(course.lessons[0]?.bucket || course.bucket || "").trim() || undefined,
      }
    : {
        id: "intro",
        title: course.title,
        content: course.description,
        videoUrl: videoUrl || undefined,
        assetKey: String(course.assetKey || "").trim() || undefined,
        bucket: String(course.bucket || "").trim() || undefined,
      };

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 md:pt-28">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">{course.level} • {course.duration}</p>
            {videoLoading && <p className="text-sm text-muted-foreground mt-1">Preparing video…</p>}
            {videoResolveError && (
              <p className="text-sm text-destructive mt-1">{videoResolveError}</p>
            )}
          </div>
        </div>

        <CoursePlayer lesson={currentLesson} />
      </main>
    </div>
  )
}
