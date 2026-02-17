"use client"

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const defaultData = [
  { subject: "Logic", A: 120, fullMark: 150 },
  { subject: "Design", A: 98, fullMark: 150 },
  { subject: "Accessibility", A: 130, fullMark: 150 },
  { subject: "Coding", A: 85, fullMark: 150 },
  { subject: "Visual", A: 65, fullMark: 150 },
  { subject: "Auditory", A: 100, fullMark: 150 },
]

export function SkillsChart({ data = defaultData }: { data?: any[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Skill Analytics</CardTitle>
        <CardDescription>Your learning strengths visualization</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="oklch(var(--border))" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} className="hidden" />
            <Radar
              name="Student"
              dataKey="A"
              stroke="oklch(var(--primary))"
              fill="oklch(var(--primary))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
