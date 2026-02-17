"use client"

import { CardFooter } from "@/components/ui/card"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Clock, Award, PlayCircle, CheckCircle2, TrendingUp, BrainCircuit } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SkillsChart } from "@/components/dashboard/skills-chart"
import { EnablePushCard } from "@/components/notifications/enable-push-card"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Spinner } from "@/components/ui/spinner"

interface Course {
  id: string
  title: string
  description: string
  duration: string
  level: string
  tags: string[]
}

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
       if (!user) return
       try {
         const querySnapshot = await getDocs(collection(db, "courses"))
         const fetched: Course[] = []
         querySnapshot.forEach((doc) => {
            const data = doc.data()
            fetched.push({ 
               id: doc.id, 
               title: data.title, 
               description: data.description, 
               duration: data.duration, 
               level: data.level, 
               tags: data.tags 
            })
         })
         setCourses(fetched)
       } catch (error) {
         console.error("Error loading dashboard data:", error)
       } finally {
         setLoading(false)
       }
    }
    fetchData()
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 gap-4">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse">Preparing your personal dashboard...</p>
      </div>
    )
  }


  return (
    <div className="flex flex-col min-h-screen bg-muted/30 selection:bg-primary/20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 pt-24 md:pt-28">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {userProfile?.displayName}!</h1>
              <p className="text-muted-foreground">Continue your personalized learning journey.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/courses">Browse Courses</Link>
              </Button>
              <Button>Resume Last Lesson</Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Courses Available" value={courses.length.toString()} />
          <StatCard icon={<Clock className="h-5 w-5 text-secondary" />} label="Hours Learned" value="12.5" />
          <StatCard icon={<Award className="h-5 w-5 text-accent-foreground" />} label="Badges Earned" value="3" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>In Progress</CardTitle>
                <CardDescription>Courses you're currently working on.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {courses.length > 0 ? (
                   <CourseProgress
                     title={courses[0].title}
                     progress={10}
                     nextLesson="Continue Learning"
                   />
                ) : (
                   <p className="text-sm text-muted-foreground">No courses started yet.</p>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="available" className="w-full">
              <TabsList>
                <TabsTrigger value="available">Recommended for You</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="available" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map(course => (
                    <RecommendedCard
                      key={course.id}
                      title={course.title}
                      duration={course.duration}
                      difficulty={course.level}
                      tag={course.tags?.[0] || "Course"}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="completed" className="mt-6">
                <Card className="flex items-center justify-center p-12 text-center border-dashed">
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No completed courses yet.</p>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <SkillsChart />

            <EnablePushCard />
            
            <Card>
              <CardHeader>
                <CardTitle>Learning Streak</CardTitle>
                <CardDescription>Keep up the momentum!</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full border-8 border-muted flex items-center justify-center">
                      <div className="text-center">
                        <span className="block text-4xl font-bold text-primary">5</span>
                        <span className="text-xs text-muted-foreground uppercase font-bold">Days</span>
                      </div>
                    </div>
                    <div
                      className="absolute top-0 left-0 h-32 w-32 rounded-full border-8 border-secondary border-t-transparent border-r-transparent -rotate-45"
                      style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
                    />
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Complete 2 more lessons to reach your weekly goal.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-muted">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseProgress({ title, progress, nextLesson }: { title: string; progress: number; nextLesson: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-sm font-medium">{progress}%</span>
      </div>
      <Progress value={progress} />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <PlayCircle className="h-3 w-3" /> Next: {nextLesson}
      </p>
    </div>
  )
}

function RecommendedCard({
  title,
  duration,
  difficulty,
  tag,
}: { title: string; duration: string; difficulty: string; tag: string }) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary">{tag}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {duration}
          </span>
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors">{title}</CardTitle>
      </CardHeader>
      <CardFooter className="p-4 pt-0 text-xs font-medium text-muted-foreground">{difficulty} Level</CardFooter>
    </Card>
  )
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
