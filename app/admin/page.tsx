"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, Activity, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { collection, getCountFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    userProfiles: 0,
  })

  useEffect(() => {
     async function fetchStats() {
        if (authLoading) return

        setLoading(true)

        try {
          // Always try to show Firestore counts (matches what's in your DB).
          // This avoids showing 0 when you only seeded Firestore profiles.
          const [usersCount, coursesCount] = await Promise.all([
            getCountFromServer(collection(db, "user"))
              .then((snap) => snap.data().count)
              .catch(() => null),
            getCountFromServer(collection(db, "courses"))
              .then((snap) => snap.data().count)
              .catch(() => null),
          ])

          setStats((prev) => ({
            ...prev,
            users: typeof usersCount === "number" ? usersCount : prev.users,
            userProfiles: typeof usersCount === "number" ? usersCount : prev.userProfiles,
            courses: typeof coursesCount === "number" ? coursesCount : prev.courses,
          }))

          // Then try admin-only API stats (Auth user count, stricter permissions).
          if (!user) {
            setStatsError("Sign in to view admin-only stats.")
            return
          }

          setStatsError(null)
          const token = await user.getIdToken()
          const res = await fetch("/api/admin/stats", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            const errMsg = String((json as any)?.error || "")
            // If the Admin SDK isn't configured, we can still show Firestore counts.
            if (res.status === 503 && errMsg.toLowerCase().includes("admin backend")) {
              return
            }
            throw new Error(errMsg || `Failed to load admin stats (${res.status})`)
          }

          setStats((prev) => ({
            ...prev,
            users: (json.users ?? json.userProfiles ?? prev.users) || 0,
            courses: (json.courses ?? prev.courses) || 0,
            userProfiles: (json.userProfiles ?? json.users ?? prev.userProfiles) || 0,
          }))
        } catch (e) {
          const message = e instanceof Error ? e.message : "Failed to fetch admin stats"
          console.error("Failed to fetch admin stats", e)
          // Keep Firestore counts if we have them. Hide the raw missing-env-var message.
          if (
            message.includes("Missing env var FIREBASE_SERVICE_ACCOUNT_KEY") ||
            message.toLowerCase().includes("admin backend is not configured")
          ) {
            return
          }
          setStatsError(message)
        } finally {
          setLoading(false)
        }
     }
     fetchStats()
  }, [user, authLoading])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor platform performance and user engagement.</p>
        {statsError && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {statsError}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={loading ? "…" : stats.users.toString()} sub="Registered users" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Active Courses" value={loading ? "…" : stats.courses.toString()} sub="Published content" icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="System Uptime" value="99.9%" sub="All systems normal" icon={<Activity className="h-4 w-4 text-green-500" />} />
        <StatCard title="Issues Reported" value="5" sub="3 pending review" icon={<AlertCircle className="h-4 w-4 text-orange-500" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user registrations and course completions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">U{i}</div>
                     <div className="flex-1">
                        <p className="text-sm font-medium">User {i} completed "Intro to Sign Language"</p>
                        <p className="text-xs text-muted-foreground">Just now</p>
                     </div>
                     <div className="text-sm text-green-500">+150 XP</div>
                  </div>
               ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Health (AWS)</CardTitle>
            <CardDescription>Status of AI integration services.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               <HealthCheck name="AWS Transcribe" status="Operational" />
               <HealthCheck name="Database (Firebase)" status="Operational" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function HealthCheck({ name, status }: { name: string; status: "Operational" | "Degraded" | "Down" }) {
   return (
      <div className="flex items-center justify-between p-2 border rounded-lg">
         <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${status === 'Operational' ? 'bg-green-500' : status === 'Degraded' ? 'bg-orange-500' : 'bg-red-500'}`} />
            <span className="font-medium text-sm">{name}</span>
         </div>
         <span className={`text-xs px-2 py-1 rounded-full ${
            status === 'Operational' ? 'bg-green-500/10 text-green-500' : 
            status === 'Degraded' ? 'bg-orange-500/10 text-orange-500' : 
            'bg-red-500/10 text-red-500'
         }`}>
            {status}
         </span>
      </div>
   )
}
