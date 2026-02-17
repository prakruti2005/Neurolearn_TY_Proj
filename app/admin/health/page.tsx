"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Server, Database, Cloud } from "lucide-react"

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">Real-time status of infrastructure and AI services.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <HealthCard
          title="AWS AI Services"
          icon={<Cloud className="h-5 w-5" />}
          description="Status of Polly, Transcribe, and Rekognition APIs."
        >
          <div className="space-y-4">
             <StatusRow name="Speech Synthesis (Polly)" status="Operational" latency="45ms" />
             <StatusRow name="Transcription (Transcribe)" status="Operational" latency="120ms" />
             <StatusRow name="Visual Analysis (Rekognition)" status="Degraded" latency="850ms" />
          </div>
        </HealthCard>

        <HealthCard
          title="Database & Storage"
          icon={<Database className="h-5 w-5" />}
          description="Firebase Firestore and Storage bucket status."
        >
           <div className="space-y-4">
             <StatusRow name="User Database (Firestore)" status="Operational" latency="22ms" />
             <StatusRow name="Content Storage (S3)" status="Operational" latency="55ms" />
             <div className="mt-4">
               <div className="flex justify-between text-sm mb-1">
                 <span>Storage Usage</span>
                 <span className="text-muted-foreground">45%</span>
               </div>
               <Progress value={45} className="h-2" />
             </div>
           </div>
        </HealthCard>

        <HealthCard
           title="Compute & API"
           icon={<Server className="h-5 w-5" />}
           description="Next.js server functions and API routes."
        >
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                   <div className="text-2xl font-bold text-green-500">99.98%</div>
                   <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                   <div className="text-2xl font-bold">0.4%</div>
                   <div className="text-xs text-muted-foreground">Error Rate</div>
                </div>
             </div>
           </div>
        </HealthCard>
      </div>
    </div>
  )
}

function HealthCard({ title, icon, description, children }: { title: string; icon: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
           {icon}
           <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function StatusRow({ name, status, latency }: { name: string; status: "Operational" | "Degraded" | "Down"; latency: string }) {
   return (
      <div className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
         <span className="font-medium text-sm">{name}</span>
         <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono">{latency}</span>
            <Badge variant="outline" className={
                status === 'Operational' ? 'bg-green-500/10 text-green-600 border-green-200' :
                status === 'Degraded' ? 'bg-orange-500/10 text-orange-600 border-orange-200' :
                'bg-red-500/10 text-red-600 border-red-200'
            }>
               {status === 'Operational' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
               {status}
            </Badge>
         </div>
      </div>
   )
}
