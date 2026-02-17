"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Subtitles,
  Accessibility,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Settings,
  Sparkles,
} from "lucide-react"

import { SignLanguageAI } from "./sign-language-ai"
import { getTranscriptionStatus, startTranscription, synthesizeSpeech } from "@/lib/aws-services"

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0:00"
  const s = Math.floor(totalSeconds)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, "0")}`
}

export interface Lesson {
  id: string
  title: string
  content: string
  videoUrl?: string
  assetKey?: string
  bucket?: string
  transcript?: { time: string; text: string }[]
}

type TranscriptSegment = { time: string; text: string; startSeconds?: number }

function secondsToTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, "0")}`
}

function timestampToSeconds(time: string): number {
  const parts = time.split(":").map((p) => Number(p))
  if (parts.some((n) => !Number.isFinite(n))) return 0
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function extractiveSummary(text: string): { summary: string; keyPoints: string[] } {
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return { summary: "", keyPoints: [] }

  const stop = new Set(
    [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "to",
      "of",
      "in",
      "on",
      "for",
      "with",
      "as",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "it",
      "this",
      "that",
      "these",
      "those",
      "we",
      "you",
      "they",
      "i",
      "he",
      "she",
      "them",
      "us",
      "our",
      "your",
      "their",
      "at",
      "by",
      "from",
      "not",
      "can",
      "will",
      "would",
      "should",
      "could",
      "if",
      "then",
      "so",
      "than",
      "about",
      "into",
      "over",
      "under",
      "also",
    ].map((s) => s.toLowerCase())
  )

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const wordFreq = new Map<string, number>()
  const tokens = clean
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w))
  for (const w of tokens) wordFreq.set(w, (wordFreq.get(w) || 0) + 1)

  const scored = sentences
    .map((s, idx) => {
      const words = s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stop.has(w))
      const score = words.reduce((acc, w) => acc + (wordFreq.get(w) || 0), 0) / Math.max(1, words.length)
      return { idx, s, score }
    })
    .sort((a, b) => b.score - a.score)

  const topCount = Math.min(4, Math.max(1, Math.ceil(sentences.length / 6)))
  const picked = scored.slice(0, topCount).sort((a, b) => a.idx - b.idx)
  const summary = picked.map((x) => x.s).join(" ")

  const keyPoints = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w)

  return { summary, keyPoints }
}

async function fetchTranscribeJson(transcriptUrl: string): Promise<any> {
  const res = await fetch(transcriptUrl)
  if (!res.ok) throw new Error(`Failed to fetch transcript (${res.status})`)
  return res.json()
}

function buildSegmentsFromTranscribe(json: any): { segments: TranscriptSegment[]; fullText: string } {
  // Whisper format (OpenAI) => verbose_json with segments
  if (Array.isArray(json?.segments)) {
    const whisperSegments = json.segments.map((seg: any) => ({
      time: secondsToTimestamp(Number(seg.start || 0)),
      text: String(seg.text || "").trim(),
      startSeconds: Number(seg.start || 0),
    }))

    const fullText = String(json?.text || whisperSegments.map((s: any) => s.text).join(" ")).trim()
    return { segments: whisperSegments.filter((s: any) => s.text), fullText }
  }

  const items: any[] = json?.results?.items || []
  const transcripts: any[] = json?.results?.transcripts || []
  const fullText = String(transcripts?.[0]?.transcript || "").trim()

  if (!items.length) {
    return { segments: fullText ? [{ time: "0:00", text: fullText }] : [], fullText }
  }

  let currentWords: string[] = []
  let currentStart = 0
  let hasStart = false
  const segments: TranscriptSegment[] = []

  const flush = () => {
    const text = currentWords.join(" ").replace(/\s+([,.!?])/g, "$1").trim()
    if (text) segments.push({ time: secondsToTimestamp(currentStart), text, startSeconds: currentStart })
    currentWords = []
    currentStart = 0
    hasStart = false
  }

  for (const it of items) {
    const type = it?.type
    const content = String(it?.alternatives?.[0]?.content || "").trim()
    if (!content) continue

    if (!hasStart && it?.start_time) {
      const s = Number(it.start_time)
      if (Number.isFinite(s)) {
        currentStart = s
        hasStart = true
      }
    }

    if (type === "punctuation") {
      currentWords.push(content)
      if (/[.!?]/.test(content)) flush()
      continue
    }

    currentWords.push(content)
    if (currentWords.length >= 28) flush()
  }

  flush()

  return { segments, fullText: fullText || segments.map((s) => s.text).join(" ") }
}

const MOCK_LESSON: Lesson = {
  id: "l1",
  title: "Introduction to Computer Architecture",
  content:
    "Computer architecture is a set of rules and methods that describe the functionality, organization, and implementation of computer systems. Some definitions of architecture define it as describing the capabilities and programming model of a computer but not a particular implementation.",
  transcript: [
    { time: "0:00", text: "Welcome to the introduction to computer architecture." },
    { time: "0:15", text: "Today we will explore the fundamental building blocks of modern systems." },
    { time: "0:45", text: "The CPU, memory, and I/O devices are the core components." },
    { time: "1:20", text: "Let's look at how instructions are fetched and executed." },
  ],
}

interface CoursePlayerProps {
  lesson?: Lesson;
}

interface CourseModule {
  title: string
  lessons: { title: string; duration?: string }[]
}

export function CoursePlayer({ lesson = MOCK_LESSON }: CoursePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showSignLanguage, setShowSignLanguage] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [speechLoading, setSpeechLoading] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState([1])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [transcribeStatus, setTranscribeStatus] = useState<"idle" | "starting" | "in_progress" | "completed" | "failed">("idle")
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>(lesson.transcript || [])
  const [summary, setSummary] = useState<string>("")
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [transcribeStartedAt, setTranscribeStartedAt] = useState<number | null>(null)
  const [transcribeEtaSeconds, setTranscribeEtaSeconds] = useState<number | null>(null)
  const [courseModules, setCourseModules] = useState<CourseModule[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.src = ""
        audioRef.current = null
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.muted = isMuted
  }, [isMuted])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = isMuted
  }, [isMuted])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = playbackRate[0]
  }, [playbackRate])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = playbackRate[0]
  }, [playbackRate])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Try to start playback when a new lesson video is loaded.
    // Browsers may block autoplay with sound; we ignore that and let the user press play.
    if (lesson.videoUrl) {
      setVideoError(null)
      setIsPlaying(false)
      try {
        video.currentTime = 0
      } catch {
        // ignore
      }
      video.play().catch(() => {
        // autoplay blocked; user can press play
      })
    }

    const onTime = () => setCurrentTime(video.currentTime || 0)
    const onDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => {
      const mediaError = video.error
      setVideoError(mediaError?.message || "Failed to load video")
      setIsPlaying(false)
    }

    video.addEventListener("timeupdate", onTime)
    video.addEventListener("loadedmetadata", onDuration)
    video.addEventListener("durationchange", onDuration)
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("error", onError)

    return () => {
      video.removeEventListener("timeupdate", onTime)
      video.removeEventListener("loadedmetadata", onDuration)
      video.removeEventListener("durationchange", onDuration)
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("error", onError)
    }
  }, [lesson.videoUrl])

  useEffect(() => {
    let cancelled = false
    let interval: any = null

    async function run() {
      // Only run for real videos.
      if (!lesson.videoUrl && !(lesson.bucket && lesson.assetKey)) return

      const mediaUri = lesson.bucket && lesson.assetKey ? `s3://${lesson.bucket}/${lesson.assetKey}` : lesson.videoUrl
      if (!mediaUri) return

      let transcribeUri = mediaUri
      if (lesson.assetKey) {
        try {
          const res = await fetch(`/api/content/signed-url?key=${encodeURIComponent(lesson.assetKey)}`)
          const json = await res.json().catch(() => ({}))
          if (res.ok && json?.url) {
            transcribeUri = String(json.url)
          }
        } catch {
          // ignore and fall back to original uri
        }
      }

      setTranscribeError(null)
      setTranscribeStatus("starting")
      setTranscribeStartedAt(Date.now())
      setTranscribeEtaSeconds(null)

      try {
        const started = await startTranscription(transcribeUri, { sync: true })
        if (cancelled) return

        const jobId = started.jobId

        if (started.status === "COMPLETED") {
          const json = started.transcriptUrl
            ? await fetchTranscribeJson(started.transcriptUrl)
            : started.transcript
          if (!json) {
            setTranscribeStatus("failed")
            setTranscribeError("Transcript returned empty")
            setTranscribeEtaSeconds(null)
            return
          }
          if (cancelled) return
          const { segments, fullText } = buildSegmentsFromTranscribe(json)
          setTranscriptSegments(segments)
          const { summary: s, keyPoints: kp } = extractiveSummary(fullText)
          setSummary(s)
          setKeyPoints(kp)
          setTranscribeStatus("completed")
          setTranscribeEtaSeconds(0)
          return
        }

        if (started.status === "FAILED") {
          setTranscribeStatus("failed")
          setTranscribeError(started.failureReason || "Transcription failed")
          setTranscribeEtaSeconds(null)
          return
        }

        setTranscribeStatus("in_progress")

        // Rough estimate: transcription time ~= 0.6 * duration (with floor/ceiling bounds).
        if (duration > 0) {
          const estimate = Math.min(Math.max(Math.ceil(duration * 0.6), 30), Math.ceil(duration * 1.5))
          setTranscribeEtaSeconds(estimate)
        } else {
          setTranscribeEtaSeconds(300)
        }

        const tick = async () => {
          try {
            if (cancelled) return
            const st = await getTranscriptionStatus(jobId)
            if (cancelled) return

            if (st.status === "FAILED") {
              setTranscribeStatus("failed")
              setTranscribeError(st.failureReason || "Transcription failed")
              setTranscribeEtaSeconds(null)
              if (interval) clearInterval(interval)
              return
            }

            if (st.status === "COMPLETED" && st.transcriptUrl) {
              const json = await fetchTranscribeJson(st.transcriptUrl)
              if (cancelled) return
              const { segments, fullText } = buildSegmentsFromTranscribe(json)
              setTranscriptSegments(segments)
              const { summary: s, keyPoints: kp } = extractiveSummary(fullText)
              setSummary(s)
              setKeyPoints(kp)
              setTranscribeStatus("completed")
              setTranscribeEtaSeconds(0)
              if (interval) clearInterval(interval)
            }
          } catch (e) {
            if (cancelled) return
            setTranscribeStatus("failed")
            setTranscribeError(e instanceof Error ? e.message : "Failed to get transcription status")
            setTranscribeEtaSeconds(null)
            if (interval) clearInterval(interval)
          }
        }

        await tick()
        interval = setInterval(tick, 5000)
      } catch (e) {
        if (cancelled) return
        setTranscribeStatus("failed")
        setTranscribeError(e instanceof Error ? e.message : "Failed to transcribe")
        setTranscribeEtaSeconds(null)
      }
    }

    run()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.videoUrl])

  useEffect(() => {
    if (transcribeStatus !== "in_progress") return
    if (duration <= 0) return
    const estimate = Math.min(Math.max(Math.ceil(duration * 0.6), 30), Math.ceil(duration * 1.5))
    setTranscribeEtaSeconds(estimate)
  }, [duration, transcribeStatus])

  // Generate course modules when transcript is ready
  useEffect(() => {
    async function generateModules() {
      if (transcribeStatus !== "completed") return
      if (courseModules.length > 0) return // Already generated
      if (!transcriptSegments || transcriptSegments.length === 0) return

      setModulesLoading(true)
      try {
        const transcriptText = transcriptSegments.map(seg => seg.text).join(" ")
        
        const response = await fetch("/api/content/generate-modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptText,
            courseTitle: lesson.title
          })
        })

        const data = await response.json()
        if (data.modules && data.modules.length > 0) {
          setCourseModules(data.modules)
        }
      } catch (error) {
        console.error("Failed to generate modules:", error)
      } finally {
        setModulesLoading(false)
      }
    }

    generateModules()
  }, [transcribeStatus, transcriptSegments, courseModules.length, lesson.title])

  useEffect(() => {
    if (transcribeStatus !== "in_progress" || !transcribeStartedAt || !transcribeEtaSeconds) return

    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - transcribeStartedAt) / 1000)
      const remaining = Math.max(transcribeEtaSeconds - elapsed, 0)
      setTranscribeEtaSeconds(remaining)
    }, 1000)

    return () => clearInterval(id)
  }, [transcribeStatus, transcribeStartedAt, transcribeEtaSeconds])

  const normalizedSegments = (transcriptSegments || [])
    .map((s) => ({
      ...s,
      startSeconds: Number.isFinite(s.startSeconds) ? s.startSeconds : timestampToSeconds(s.time),
    }))
    .sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0))

  const activeCaption = (() => {
    if (!normalizedSegments.length) return ""
    const time = currentTime
    for (let i = 0; i < normalizedSegments.length; i++) {
      const cur = normalizedSegments[i]
      const next = normalizedSegments[i + 1]
      const start = cur.startSeconds || 0
      const end = next?.startSeconds ?? start + 6
      if (time >= start && time < end) return cur.text
    }
    return normalizedSegments[normalizedSegments.length - 1]?.text || ""
  })()

  const toggleVideoPlayback = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      setVideoError(null)
      if (video.paused) {
        await video.play()
      } else {
        video.pause()
      }
    } catch (e) {
      console.error("Video playback failed", e)
      setVideoError(e instanceof Error ? e.message : "Video playback failed")
    }
  }

  const stopSpeech = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setSpeaking(false)
    setSpeechLoading(false)
  }

  const toggleSpeech = async () => {
    if (speaking || speechLoading) {
      stopSpeech()
      return
    }

    try {
      setSpeechError(null)
      setSpeechLoading(true)

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }

      const { audioUrl } = await synthesizeSpeech(lesson.content, "Joanna")
      audioUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.muted = isMuted
      audio.playbackRate = playbackRate[0]
      audio.onended = () => {
        setSpeaking(false)
      }

      await audio.play()
      setSpeaking(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to synthesize speech"
      console.error("Speech playback failed", e)
      setSpeechError(message)
      setSpeaking(false)
    } finally {
      setSpeechLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {/* Main Video/Content Area */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group">
          {lesson.videoUrl ? (
            <video
              ref={videoRef}
              src={lesson.videoUrl}
              className="absolute inset-0 h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              muted={isMuted}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No video attached to this course.</p>
              </div>
            </div>
          )}

          {/* AI Sign Language Avatar/Recognition Overlay */}
          {showSignLanguage && (
            <div className="absolute right-4 bottom-16 w-1/3 aspect-video z-20 shadow-2xl animate-in slide-in-from-right-10 fade-in duration-500">
              <SignLanguageAI />
            </div>
          )}

          {/* Subtitles Overlay */}
          {showSubtitles && isPlaying && (
            <div className="absolute bottom-12 inset-x-0 flex justify-center px-8">
              <p className="bg-black/80 text-white px-4 py-2 rounded text-lg font-medium text-center max-w-2xl">
                {activeCaption || "Captions not available yet."}
              </p>
            </div>
          )}

          {/* Custom Controls */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleVideoPlayback}
                  disabled={!lesson.videoUrl}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </Button>
                <span className="text-white text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {videoError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {videoError}
          </div>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="content">Lesson</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{lesson.title}</CardTitle>
                  <CardDescription>Module 1: Foundations</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={toggleSpeech} className={speaking ? "border-primary" : ""}>
                  <Volume2 className={`h-4 w-4 mr-2 ${speaking ? "text-primary animate-pulse" : ""}`} />
                    {speaking || speechLoading ? "Stop Audio" : "Read Content"}
                </Button>
              </CardHeader>
              <CardContent>
                  {speechError && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {speechError}
                    </div>
                  )}
                  <p className="text-lg leading-relaxed text-muted-foreground">{lesson.content}</p>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous Lesson
                  </Button>
                  <Button>
                    Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="transcript" className="mt-6">
            <Card>
              <ScrollArea className="h-[400px]">
                <CardContent className="p-6 space-y-4">
                  {transcribeStatus !== "idle" && (
                    <div className="text-sm text-muted-foreground">
                      {transcribeStatus === "starting" && "Starting transcription…"}
                      {transcribeStatus === "in_progress" && (
                        <span>
                          Transcribing video…
                          {transcribeEtaSeconds !== null ? ` Estimated time left: ${formatTime(transcribeEtaSeconds)}.` : ""}
                        </span>
                      )}
                      {transcribeStatus === "completed" && "Transcript ready."}
                      {transcribeStatus === "failed" && "Transcription failed."}
                      {transcribeError && <span className="text-destructive"> {transcribeError}</span>}
                    </div>
                  )}

                  {(transcriptSegments || []).map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-4 group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                    >
                      <span className="text-primary font-mono text-sm shrink-0">{item.time}</span>
                      <p className="text-sm leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>
          <TabsContent value="notes" className="mt-6">
            <Card>
              <ScrollArea className="h-[400px]">
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                  <CardDescription>Generated automatically from the lesson video.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {!lesson.videoUrl && (
                    <div className="text-sm text-muted-foreground">No video attached, so there’s nothing to summarize.</div>
                  )}

                  {lesson.videoUrl && transcribeStatus !== "idle" && (
                    <div className="text-sm text-muted-foreground">
                      {transcribeStatus === "starting" && "Starting transcription…"}
                      {transcribeStatus === "in_progress" && "Generating transcript and summary…"}
                      {transcribeStatus === "completed" && "Summary ready."}
                      {transcribeStatus === "failed" && "Summary failed."}
                    </div>
                  )}

                  {transcribeError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {transcribeError}
                    </div>
                  )}

                  {lesson.videoUrl && transcribeStatus === "completed" && !summary && !keyPoints.length && (
                    <div className="text-sm text-muted-foreground">Transcript completed, but no text was returned.</div>
                  )}

                  {!!summary && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Summary</div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
                    </div>
                  )}

                  {!!keyPoints.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Key points</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {keyPoints.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar - Course Progress */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Course Content
              </div>
              {transcribeStatus === "completed" && courseModules.length === 0 && !modulesLoading && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (!transcriptSegments || transcriptSegments.length === 0) return
                    setModulesLoading(true)
                    try {
                      const transcriptText = transcriptSegments.map(seg => seg.text).join(" ")
                      const response = await fetch("/api/content/generate-modules", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcriptText, courseTitle: lesson.title })
                      })
                      const data = await response.json()
                      if (data.modules && data.modules.length > 0) {
                        setCourseModules(data.modules)
                      }
                    } catch (error) {
                      console.error("Failed to generate modules:", error)
                    } finally {
                      setModulesLoading(false)
                    }
                  }}
                  className="text-xs"
                >
                  Generate AI Outline
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-2">
                {modulesLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center flex flex-col items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                    Generating course outline with AI...
                  </div>
                ) : courseModules.length > 0 ? (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      AI-Generated Outline
                    </div>
                    {courseModules.map((module, idx) => (
                      <div key={idx}>
                        {idx > 0 && <Separator className="my-2" />}
                        <ModuleItem 
                          title={module.title} 
                          lessons={module.lessons.map(l => l.duration ? `${l.title} (${l.duration})` : l.title)} 
                          active={idx === 0}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <ModuleItem title="1. Foundations" lessons={["What is Architecture?", "Historical Context"]} active />
                    <Separator className="my-2" />
                    <ModuleItem title="2. The CPU" lessons={["ALU & Registers", "Instruction Cycles"]} />
                    <Separator className="my-2" />
                    <ModuleItem title="3. Memory Systems" lessons={["Cache Hierarchy", "Virtual Memory"]} />
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm">Playback Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span>Playback Speed</span>
                <span>{playbackRate[0]}x</span>
              </div>
              <Slider value={playbackRate} onValueChange={setPlaybackRate} max={2} step={0.25} min={0.5} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Dyslexic Font</span>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModuleItem({ title, lessons, active }: { title: string; lessons: string[]; active?: boolean }) {
  return (
    <div className="space-y-1">
      <div className={`px-4 py-2 text-sm font-semibold rounded-lg ${active ? "bg-primary/5 text-primary" : ""}`}>
        {title}
      </div>
      <div className="space-y-0.5">
        {lessons.map((lesson, i) => (
          <button
            key={i}
            className={`w-full text-left px-8 py-2 text-xs hover:bg-muted rounded-md transition-colors ${
              active && i === 0 ? "text-primary font-medium" : "text-muted-foreground"
            }`}
          >
            {lesson}
          </button>
        ))}
      </div>
    </div>
  )
}
