"use client"

import { useAuth } from "@/contexts/auth-context"
import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Mail, Shield, BookOpen, Users, BrainCircuit } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 gap-4">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 selection:bg-primary/20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 pt-24 md:pt-28">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>

          <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
            <div className="space-y-6">
               <Card>
                 <CardContent className="pt-6 text-center flex flex-col items-center">
                   <Avatar className="h-24 w-24 mb-4">
                     <AvatarImage src={user.photoURL || ""} />
                     <AvatarFallback className="text-2xl">{userProfile?.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <h2 className="text-xl font-semibold">{userProfile?.displayName || "User"}</h2>
                   <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                   <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                     {userProfile?.role || "Student"}
                   </div>
                 </CardContent>
               </Card>
            </div>

            <div className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
                      <CardDescription>View and manage your account details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <div className="relative">
                           <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                           <Input id="displayName" defaultValue={userProfile?.displayName} disabled className="pl-9" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                           <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                           <Input id="email" defaultValue={user.email || ""} disabled className="pl-9" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                         <Label htmlFor="role">Role</Label>
                         <div className="relative">
                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input id="role" defaultValue={userProfile?.role || "Student"} disabled className="pl-9 capitalize" />
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle>{userProfile?.role === "teacher" ? "Teaching Preferences" : "Learning Preferences"}</CardTitle>
                      <CardDescription>
                        {userProfile?.role === "teacher"
                          ? "Manage your classroom tools and settings."
                          : "Customize your learning experience."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {userProfile?.role === "teacher" ? (
                        <>
                          <div className="p-4 rounded-lg border bg-muted/50 flex items-center gap-4">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">Classroom Analytics</p>
                              <p className="text-sm text-muted-foreground">
                                Receive weekly reports on student engagement and performance.
                              </p>
                            </div>
                          </div>
                          <div className="p-4 rounded-lg border bg-muted/50 flex items-center gap-4">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">Auto-Grading Assistant</p>
                              <p className="text-sm text-muted-foreground">
                                Enable AI suggestions for grading student submissions.
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 rounded-lg border bg-muted/50 flex items-center gap-4">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Content Adaptation</p>
                            <p className="text-sm text-muted-foreground">
                              AI automatically adapts content based on your progress.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground italic">More settings coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
