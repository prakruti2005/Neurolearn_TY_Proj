export const demoProfile = {
  displayName: "Ammar Khalid",
  email: "ammar@student.edu",
  role: "student",
  initials: "AK",
}

export const demoCourses = [
  {
    id: "neural-architecture",
    title: "Neural Architecture Basics",
    description: "Understand how brain-inspired architectures shape adaptive learning systems.",
    duration: "6 hours",
    level: "Beginner",
    tags: ["AI", "Neuro", "Foundations"],
    lessons: [
      {
        id: "na-1",
        title: "Why Adaptive Systems Matter",
        content:
          "Adaptive systems personalize content by observing patterns, reducing cognitive load, and guiding learners through progressive challenges.",
        transcript: [
          { time: "0:00", text: "Adaptive learning starts with understanding learner context." },
          { time: "0:25", text: "We adapt pacing, difficulty, and modality to reduce friction." },
          { time: "0:55", text: "These principles drive inclusive learning outcomes." },
        ],
      },
    ],
  },
  {
    id: "inclusive-design",
    title: "Inclusive Design Studio",
    description: "Design interfaces that feel natural for diverse learners and abilities.",
    duration: "8 hours",
    level: "Intermediate",
    tags: ["UX", "Accessibility"],
    lessons: [
      {
        id: "id-1",
        title: "Designing for Range",
        content:
          "Inclusive design starts with extremes. Build for outliers and everyone benefits from clarity and comfort.",
      },
    ],
  },
  {
    id: "sign-language",
    title: "Sign Language Foundations",
    description: "Learn essential signing patterns and recognition workflows.",
    duration: "5 hours",
    level: "Beginner",
    tags: ["ASL", "Communication"],
    lessons: [
      {
        id: "sl-1",
        title: "Gesture Clarity",
        content:
          "Clear signing relies on consistent hand shapes, spacing, and rhythm. Practice with short, focused drills.",
      },
    ],
  },
  {
    id: "focus-flow",
    title: "Focus Flow for Learners",
    description: "Build routines that support attention, memory, and feedback cycles.",
    duration: "4 hours",
    level: "All Levels",
    tags: ["Learning", "Habits"],
    lessons: [
      {
        id: "ff-1",
        title: "Micro Goals",
        content:
          "Small goals compound. Progress tracking and reflection create measurable motivation loops.",
      },
    ],
  },
  {
    id: "accessible-web",
    title: "Accessible Web Interfaces",
    description: "Apply WCAG principles to create clean, high-contrast experiences.",
    duration: "7 hours",
    level: "Intermediate",
    tags: ["Web", "WCAG"],
    lessons: [
      {
        id: "aw-1",
        title: "Readable Systems",
        content:
          "Color, spacing, and typography should communicate structure before motion or imagery.",
      },
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Learning Assistant",
    description: "Craft AI prompts that improve focus, recall, and iteration.",
    duration: "3 hours",
    level: "Beginner",
    tags: ["AI", "Study"],
    lessons: [
      {
        id: "ai-1",
        title: "Prompt Structure",
        content:
          "High-quality prompts include context, constraints, and a clear target output format.",
      },
    ],
  },
]

export const demoCommunityTags = [
  { id: "tag-1", name: "Accessibility", posts: 24 },
  { id: "tag-2", name: "AI Tools", posts: 18 },
  { id: "tag-3", name: "Neurodiversity", posts: 14 },
  { id: "tag-4", name: "Study Methods", posts: 11 },
]

export const demoPosts = [
  {
    id: "post-1",
    author: "Dr. Lina Osman",
    role: "mentor",
    content:
      "We tested adaptive pacing in three cohorts and saw a 22% improvement in completion rates. The key was giving learners control over the pace slider.",
    tags: ["Accessibility", "Research"],
    likes: 72,
    replies: 8,
    timestamp: "2 hours ago",
  },
  {
    id: "post-2",
    author: "Omar Saleh",
    role: "student",
    content:
      "The focus flow routine made my weekly revision feel much lighter. I am sharing a checklist template if anyone wants it.",
    tags: ["Study Methods"],
    likes: 34,
    replies: 3,
    timestamp: "Yesterday",
  },
  {
    id: "post-3",
    author: "Prof. Hannah Boyd",
    role: "teacher",
    content:
      "Inclusive design is not just about compliance. It changes how students feel before they even start learning.",
    tags: ["UX", "Neurodiversity"],
    likes: 56,
    replies: 5,
    timestamp: "2 days ago",
  },
]

export const demoAdminStats = {
  users: 1284,
  courses: 24,
  uptime: "99.98%",
  issues: 2,
}

export const demoAdminContent = demoCourses.map((course, idx) => ({
  id: course.id,
  title: course.title,
  type: idx % 2 === 0 ? "Video" : "Lesson",
  status: idx % 3 === 0 ? "Draft" : "Published",
  students: 120 + idx * 37,
}))

export const demoAdminUsers = [
  {
    id: "user-1",
    displayName: "Ammar Khalid",
    email: "ammar@student.edu",
    role: "student",
    status: "Active",
  },
  {
    id: "user-2",
    displayName: "Dr. Lina Osman",
    email: "lina.mentor@neurolearn.ai",
    role: "mentor",
    status: "Active",
  },
  {
    id: "user-3",
    displayName: "Prof. Hannah Boyd",
    email: "hannah@neurolearn.ai",
    role: "teacher",
    status: "Active",
  },
  {
    id: "user-4",
    displayName: "System Admin",
    email: "admin@neurolearn.ai",
    role: "admin",
    status: "Active",
  },
]

export const demoTimeline = [
  {
    title: "Adaptive lesson released",
    detail: "New pacing controls are now live for all learners.",
    time: "Today",
  },
  {
    title: "Community mentoring pilot",
    detail: "Mentors scheduled 18 live sessions this week.",
    time: "Yesterday",
  },
  {
    title: "Accessibility audit passed",
    detail: "WCAG AA compliance verified on core screens.",
    time: "2 days ago",
  },
]
