"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, Database, AlertCircle } from "lucide-react"
import { collection, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const SAMPLE_COURSES = [
  {
    title: "Foundations of Computer Science",
    description: "A comprehensive introduction to the core concepts of computer science including algorithms and data structures.",
    duration: "12 hours",
    level: "Beginner",
    tags: ["CS", "Basics", "Algorithms"],
    image: "/courses/cs-foundations.jpg",
    lessons: [
      {
        id: "cs-1",
        title: "What is a Computer?",
        content:
          "Learn what computers do, how they represent information, and why abstraction matters in software engineering.",
        transcript: [
          { time: "0:00", text: "Welcome! Today we define what a computer is." },
          { time: "0:20", text: "We will cover input, processing, output, and storage." },
        ],
      },
      {
        id: "cs-2",
        title: "Algorithms and Complexity",
        content:
          "Understand how algorithms solve problems and how time/space complexity affects performance.",
        transcript: [
          { time: "0:00", text: "An algorithm is a step-by-step process." },
          { time: "0:30", text: "Big-O notation estimates growth as input size increases." },
        ],
      },
    ],
  },
  {
    title: "Introduction to Sign Language",
    description: "Learn the basics of American Sign Language (ASL) with our AI-powered interactive lessons.",
    duration: "8 hours",
    level: "Beginner",
    tags: ["AI-Sign", "Accessibility"],
    image: "/courses/sign-language.jpg",
    lessons: [
      {
        id: "asl-1",
        title: "Finger Spelling Basics",
        content:
          "Practice finger spelling with slow/fast modes and accessibility-friendly pacing.",
      },
      {
        id: "asl-2",
        title: "Everyday Greetings",
        content:
          "Learn common greetings and polite phrases used in daily conversation.",
      },
    ],
  },
  {
    title: "Web Accessibility Fundamentals",
    description: "Master the WCAG guidelines and learn to build inclusive web experiences for everyone.",
    duration: "6 hours",
    level: "Intermediate",
    tags: ["Access", "WCAG", "Web Dev"],
    image: "/courses/web-a11y.jpg",
    lessons: [
      {
        id: "a11y-1",
        title: "WCAG in Plain Language",
        content:
          "Understand the POUR principles (Perceivable, Operable, Understandable, Robust) and how to apply them.",
      },
      {
        id: "a11y-2",
        title: "Keyboard Navigation",
        content:
          "Build interfaces that are fully usable without a mouse and learn common pitfalls.",
      },
    ],
  },
  {
    title: "Inclusive Design Principles",
    description: "Understanding how to design products that are accessible and usable by as many people as possible.",
    duration: "10 hours",
    level: "Advanced",
    tags: ["Design", "UX", "Inclusive"],
    image: "/courses/inclusive-design.jpg",
    lessons: [
      {
        id: "ux-1",
        title: "Designing for Real People",
        content:
          "Learn inclusive research methods, personas, and how to avoid one-size-fits-all design assumptions.",
      },
      {
        id: "ux-2",
        title: "Accessible Components",
        content:
          "Buttons, inputs, dialogs: how to design and validate accessible UI components.",
      },
    ],
  },
  {
    title: "Neurodiversity in Tech",
    description: "Strategies for working with and designing for neurodiverse individuals in technology.",
    duration: "4 hours",
    level: "All Levels",
    tags: ["Neurodiversity", "Management", "Soft Skills"],
    image: "/courses/neurodiversity.jpg",
    lessons: [
      {
        id: "nd-1",
        title: "Understanding Neurodiversity",
        content:
          "A practical overview of neurodiversity and how environments can support different thinking styles.",
      },
      {
        id: "nd-2",
        title: "Inclusive Communication",
        content:
          "Workflows, feedback, and collaboration patterns that reduce ambiguity and cognitive load.",
      },
    ],
  },
  {
    title: "Computer Architecture Essentials",
    description: "CPU, memory, instruction cycles, and performance—explained with accessible visuals and transcripts.",
    duration: "9 hours",
    level: "Intermediate",
    tags: ["Architecture", "Hardware", "Systems"],
    image: "/courses/architecture.jpg",
    lessons: [
      {
        id: "arch-1",
        title: "CPU and Instruction Cycle",
        content:
          "Fetch, decode, execute—how a CPU runs programs and why the cycle matters.",
        transcript: [
          { time: "0:00", text: "Let's learn the instruction cycle." },
          { time: "0:25", text: "Fetch the instruction from memory." },
          { time: "0:55", text: "Decode it, then execute it." },
        ],
      },
    ],
  },
  {
    title: "Data Structures for Beginners",
    description: "Lists, stacks, queues, trees, and hash maps—learn when and why to use each.",
    duration: "11 hours",
    level: "Beginner",
    tags: ["Data Structures", "Algorithms", "Practice"],
    image: "/courses/data-structures.jpg",
    lessons: [
      {
        id: "ds-1",
        title: "Arrays vs Linked Lists",
        content:
          "Tradeoffs, complexity, and choosing the right structure for your problem.",
      },
      {
        id: "ds-2",
        title: "Hash Maps",
        content:
          "Fast lookups, hashing, collisions, and practical examples.",
      },
    ],
  },
  {
    title: "AI Study Assistant: Prompting Basics",
    description: "Learn how to ask better questions and get more reliable answers from AI tools for studying.",
    duration: "3 hours",
    level: "All Levels",
    tags: ["AI", "Study Skills", "Productivity"],
    image: "/courses/ai-prompting.jpg",
    lessons: [
      {
        id: "ai-1",
        title: "Clear Prompts",
        content:
          "How to structure prompts with context, constraints, and examples.",
      },
      {
        id: "ai-2",
        title: "Checking Answers",
        content:
          "How to verify outputs and reduce hallucinations using cross-checking.",
      },
    ],
  }
]

const SAMPLE_USERS = [
  {
    displayName: "Alice Student",
    email: "alice@example.com",
    role: "student",
    status: "Active",
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Bob Admin",
    email: "bob@admin.com",
    role: "admin",
    status: "Active",
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Charlie Tech",
    email: "charlie@tech.com",
    role: "teacher",
    status: "Inactive",
    createdAt: new Date().toISOString()
  }
]

export default function SeedDataPage() {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [success, setSuccess] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<{ [key: string]: string | null }>({})

  const seedCourses = async () => {
    setLoading(prev => ({ ...prev, courses: true }))
    setError(prev => ({ ...prev, courses: null }))
    setSuccess(prev => ({ ...prev, courses: false }))

    try {
      const batch = writeBatch(db)
      const coursesRef = collection(db, "courses")

      SAMPLE_COURSES.forEach(course => {
        const newDocRef = doc(coursesRef)
        batch.set(newDocRef, course)
      })

      await batch.commit()
      setSuccess(prev => ({ ...prev, courses: true }))
    } catch (err: any) {
      console.error("Error seeding courses:", err)
      setError(prev => ({ ...prev, courses: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, courses: false }))
    }
  }

  const seedUsers = async () => {
    setLoading(prev => ({ ...prev, users: true }))
    setError(prev => ({ ...prev, users: null }))
    setSuccess(prev => ({ ...prev, users: false }))

    try {
      // Note: This only adds documents to Firestore. 
      // It DOES NOT create Auth accounts. These are for display testing only.
      const batch = writeBatch(db)
      const usersRef = collection(db, "user")

      SAMPLE_USERS.forEach(user => {
        const newDocRef = doc(usersRef)
        batch.set(newDocRef, user)
      })

      await batch.commit()
      setSuccess(prev => ({ ...prev, users: true }))
    } catch (err: any) {
      console.error("Error seeding users:", err)
      setError(prev => ({ ...prev, users: err.message }))
    } finally {
      setLoading(prev => ({ ...prev, users: false }))
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Seeder</h1>
        <p className="text-muted-foreground mt-2">
          Use this tool to populate your Firestore database with sample data for testing.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Course Seeder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Courses
            </CardTitle>
            <CardDescription>
              Adds {SAMPLE_COURSES.length} sample courses to the 'courses' collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Includes: Foundations of CS, Sign Language, Web Accessibility...
              </div>
              <Button onClick={seedCourses} disabled={loading.courses}>
                {loading.courses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {success.courses ? "Seeded!" : "Run Seeder"}
              </Button>
            </div>
            {success.courses && (
              <div className="mt-4 flex items-center text-green-600 text-sm bg-green-50 p-2 rounded">
                <CheckCircle className="h-4 w-4 mr-2" />
                Successfully added courses to Firestore.
              </div>
            )}
            {error.courses && (
              <div className="mt-4 flex items-center text-destructive text-sm bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 mr-2" />
                Error: {error.courses}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Seeder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Mock Users
            </CardTitle>
            <CardDescription>
              Adds {SAMPLE_USERS.length} sample user profiles to the 'user' collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded mb-4 text-sm">
                <strong>Note:</strong> These users are for the Admin Dashboard display only. They are not real Authentication accounts and cannot log in.
             </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Includes: Alice (Student), Bob (Admin), Charlie (Teacher)
              </div>
              <Button onClick={seedUsers} disabled={loading.users} variant="secondary">
                {loading.users && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {success.users ? "Seeded!" : "Run Seeder"}
              </Button>
            </div>
            {success.users && (
              <div className="mt-4 flex items-center text-green-600 text-sm bg-green-50 p-2 rounded">
                <CheckCircle className="h-4 w-4 mr-2" />
                Successfully added users to Firestore.
              </div>
            )}
            {error.users && (
              <div className="mt-4 flex items-center text-destructive text-sm bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 mr-2" />
                Error: {error.users}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
