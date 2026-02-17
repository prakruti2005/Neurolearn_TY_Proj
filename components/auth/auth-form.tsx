"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp, signIn, type UserRole } from "@/lib/firebase-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function AuthForm({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role] = useState<UserRole>("student")
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState(mode)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (authMode === "signup") {
        const { error } = await signUp(email, password, role, displayName)
        if (error) throw new Error(error)
        toast({ title: "Account created", description: "Welcome to NeuroLearn!" })
      } else {
        const { error } = await signIn(email, password)
        if (error) throw new Error(error)
        toast({ title: "Logged in", description: "Welcome back!" })
      }
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-card border-white/20 shadow-2xl backdrop-blur-3xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">{authMode === "signin" ? "Welcome Back" : "Join NeuroLearn"}</CardTitle>
        <CardDescription className="text-center text-muted-foreground/80">
          {authMode === "signin"
            ? "Enter your credentials to access your account"
            : "Join NeuroLearn and start your personalized learning journey"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {authMode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Accounts created here are <span className="font-medium text-foreground">Student</span> accounts.
                Teachers are created by an admin.
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
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
            {authMode === "signin" ? "Sign In" : "Create Account"}
          </Button>
          <div className="text-sm text-center">
            {authMode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => setAuthMode("signup")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => setAuthMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
