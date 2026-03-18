import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, Fraunces, JetBrains_Mono, Lexend } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PushNotificationsManager } from "@/components/notifications/push-notifications-manager"
import "./globals.css"

const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" })
const _fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" })
const _jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })
const _lexend = Lexend({ subsets: ["latin"], variable: "--font-dyslexic" })

export const metadata: Metadata = {
  title: "NeuroLearn - AI-Powered Accessible Learning",
  description:
    "An inclusive e-learning platform with AI-driven accessibility features for students with diverse learning needs",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_spaceGrotesk.variable} ${_fraunces.variable} ${_jetbrains.variable} ${_lexend.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <PushNotificationsManager />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
