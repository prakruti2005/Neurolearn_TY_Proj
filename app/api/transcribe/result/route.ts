import { NextResponse } from "next/server"
import { getWhisperJob } from "@/lib/whisper-jobs"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const jobName = String(searchParams.get("jobName") || "").trim()
  if (!jobName) return NextResponse.json({ error: "jobName is required" }, { status: 400 })

  const job = await getWhisperJob(jobName)
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
  if (job.status !== "COMPLETED" || !job.transcript) {
    return NextResponse.json({ error: "Transcript not ready" }, { status: 409 })
  }

  return NextResponse.json(job.transcript)
}
