"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Clock, Signal, Accessibility, Loader2 } from "lucide-react"
import Link from "next/link"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Course {
  id: string
  title: string
  description: string
  duration: string
  level: string
  tags: string[]
  image?: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    async function fetchCourses() {
       try {
         // Load from Firestore courses collection
         const querySnapshot = await getDocs(collection(db, "courses"))
         const fetchedCourses: Course[] = []
         querySnapshot.forEach((doc) => {
           const data = doc.data()
           fetchedCourses.push({
             id: doc.id,
             title: data.title || "Untitled Course",
             description: data.description || "No description provided.",
             duration: data.duration || "N/A",
             level: data.level || "General",
             tags: data.tags || [],
             image: data.image
           } as Course)
         })
         setCourses(fetchedCourses)
       } catch (error) {
         console.error("Error fetching courses:", error)
       } finally {
         setLoading(false)
       }
    }
    fetchCourses()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredCourses = normalizedQuery
    ? courses.filter((course) => {
        const haystack = [
          course.title,
          course.description,
          course.level,
          ...(course.tags || []),
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : courses

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 selection:bg-primary/20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 md:pt-28">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Explore Courses</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover inclusive learning paths tailored to your needs. All courses feature AI-driven accessibility support.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for topics, skills, or accessibility features..."
              className="pl-10 h-12"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search courses"
            />
          </div>
          <Button size="lg" onClick={() => setQuery((value) => value.trim())}>Find Courses</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
               <div className="col-span-full text-center py-12 text-muted-foreground">
                 {courses.length === 0
                   ? "No courses found. Check back later!"
                   : "No courses match your search. Try another keyword."}
               </div>
            ) : (
              filteredCourses.map((course) => (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative bg-muted rounded-t-xl overflow-hidden">
                    {/* <Image src={course.image} fill alt={course.title} className="object-cover" /> */}
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                      <BookOpen className="h-12 w-12 text-primary/20" />
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="mb-2">{course.level}</Badge>
                    </div>
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {course.duration}
                      </div>
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Signal className="h-4 w-4" />
                          {course.tags[0]}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/courses/${encodeURIComponent(course.id)}`}>Start Learning</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

