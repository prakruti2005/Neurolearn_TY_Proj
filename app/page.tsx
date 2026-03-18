"use client"

import React from "react"
import { Navbar } from "@/components/layout/navbar"
import { FeatureCard } from "@/components/landing-page/feature-card"
import { Button } from "@/components/ui/button"
import {
  BrainCircuit,
  Accessibility,
  Sparkles,
  LineChart,
  Users,
  ArrowRight,
  PlayCircle,
  HeartHandshake,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background mesh-gradient selection:bg-primary/30">
      <Navbar />

      <main className="flex-1 pt-24 md:pt-28">
        {/* Hero Section */}
        <section className="relative pt-20 pb-20 px-4 md:pt-32 md:pb-36 overflow-hidden">
          <div className="container mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="flex flex-col items-start text-left max-w-2xl">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card text-primary text-sm font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-top-4 duration-1000 hover:scale-105 transition-transform cursor-default">
                  <HeartHandshake className="h-4 w-4 animate-pulse" />
                  <span>Empowering Every Mind</span>
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 md:mb-8 leading-[0.98] animate-in fade-in slide-in-from-bottom-8 duration-700 drop-shadow-sm">
                  Adaptive <br />
                  <span className="text-rainbow italic pb-3 pr-1 inline-block leading-[1.05]">
                    Intelligence
                  </span>{" "}
                  <br />
                  For All.
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground/90 mb-10 md:mb-12 max-w-xl text-pretty leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                  NeuroLearn leverages neural AI to create multi-sensory learning pathways, making complex education
                  accessible to students with diverse cognitive and physical needs.
                </p>

                <div className="flex flex-col sm:flex-row gap-5 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
                  <Button
                    size="lg"
                    className="h-12 md:h-14 px-8 md:px-10 rounded-2xl text-base md:text-lg shadow-xl shadow-primary/20 group transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-secondary hover:shadow-primary/40"
                    asChild
                  >
                    <Link href="/login?mode=signup">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 md:h-14 px-8 md:px-10 rounded-2xl text-base md:text-lg glass-card hover:bg-white/10 group bg-transparent border-primary/20"
                    asChild
                  >
                    <Link href="#impact">
                      <PlayCircle className="mr-2 h-5 w-5 text-secondary group-hover:rotate-12 transition-transform" />
                      See the Impact
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="relative hidden md:block animate-in zoom-in duration-1000 delay-500 hover:scale-[1.02] transition-transform perspective-1000">
                <div className="relative z-20 glass-card p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border-white/20 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] backdrop-blur-3xl transform rotate-2 lg:rotate-3 hover:rotate-0 transition-all duration-700 animate-float hover:shadow-[0_0_80px_-12px_rgba(var(--primary),0.5)] max-w-[560px] ml-auto">
                  <div className="aspect-square rounded-2xl bg-muted/20 flex items-center justify-center mb-6 overflow-hidden relative group shadow-inner border border-white/10">
                    <Image 
                      src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop"
                      alt="Neural Interface Visualization"
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent group-hover:opacity-0 transition-opacity" />
                  </div>
                  <div className="space-y-6">
                    <div className="h-4 w-2/3 bg-background/50 rounded-full animate-pulse overflow-hidden">
                       <div className="h-full w-full bg-primary/40 -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                    <div className="h-4 w-full bg-background/30 rounded-full" />
                    <div className="h-4 w-4/5 bg-background/30 rounded-full" />
                  </div>
                </div>
                {/* Decorative floating elements */}
                <motion.div 
                  animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-12 -left-12 w-32 h-32 bg-secondary/30 rounded-2xl blur-xl" 
                />
                <motion.div 
                   animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
                   transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute -bottom-12 -right-12 w-40 h-40 bg-primary/30 rounded-full blur-2xl" 
                />
              </div>
            </div>
          </div>

          {/* Dynamic background effects - JS based for reliability */}
          <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
             <BackgroundBlobs />
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-primary">
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Scroll to Explore</span>
            <ChevronDown className="h-6 w-6" />
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Accessibility without <span className="text-secondary">Compromise</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                We've built tools that don't just meet standards—they set them.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="h-1 w-32 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-primary animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-[240px]">
            <FeatureCard
              className="md:col-span-3 lg:col-span-4 row-span-2"
              icon={<Accessibility className="h-10 w-10" />}
              title="Sign Language AI"
              description="Real-time conversion of speech into sign-language animations using custom neural models."
              variant="primary"
            />
            <FeatureCard
              className="md:col-span-3 lg:col-span-8"
              icon={<Sparkles className="h-10 w-10" />}
              title="Speech & Transcription"
              description="Multi-modal conversion for visual and hearing impaired learners."
              variant="glass"
            />
            <FeatureCard
              className="md:col-span-3 lg:col-span-4"
              icon={<LineChart className="h-10 w-10" />}
              title="Skill Analytics"
              description="Visualizing cognitive growth pathways."
              variant="glass"
            />
            <FeatureCard
              className="md:col-span-3 lg:col-span-4"
              icon={<Users className="h-10 w-10" />}
              title="Community"
              description="Collaborative learning for all."
              variant="glass"
            />
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="bg-primary text-primary-foreground py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to Bridge the Accessibility Gap?</h2>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
              Join thousands of learners and educators building an inclusive digital learning environment.
            </p>
            <Button size="lg" variant="secondary" className="text-lg px-10" asChild>
              <Link href="/login?mode=signup">Get Started Now</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <BrainCircuit className="h-6 w-6" />
            <span>NeuroLearn</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 NeuroLearn AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BackgroundBlobs() {
  return (
    <>
      <motion.div
        animate={{
          x: [-100, 100, -100],
          y: [-50, 50, -50],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
        animate={{
          x: [100, -100, 100],
          y: [50, -50, 50],
          scale: [1.2, 1, 1.2],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
         animate={{ x: [0, 50, -50, 0], y: [0, -100, 100, 0] }}
         transition={{ duration: 30, repeat: Infinity }}
         className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] mix-blend-screen"
      />
    </>
  )
}


