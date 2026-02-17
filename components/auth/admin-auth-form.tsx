"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn, signOut, getUserProfile } from "@/lib/firebase-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function AdminAuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSignIn = async () => {
    const { user, error } = await signIn(email, password)
    if (error || !user) throw new Error(error || "Sign-in failed")

    const profile = await getUserProfile(user.uid)
    if (!profile || profile.role !== "admin") {
      await signOut()
      throw new Error("This account is not an admin.")
    }

    router.push("/admin")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await handleSignIn()
      toast({ title: "Logged in", description: "Welcome to the Admin Console." })
    } catch (err: any) {
      toast({
        title: "Admin Auth Error",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-card border-white/20 shadow-2xl backdrop-blur-3xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Admin Sign In
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground/80">
          Sign in with an admin account
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
