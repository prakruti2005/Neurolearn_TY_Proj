import { NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from "@/lib/aws-clients"
import { getWhisperJob } from "@/lib/whisper-jobs"

export const runtime = "nodejs"

async function maybeSignTranscriptUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("s3://")) return url

  try {
    const withoutScheme = url.slice(5)
    const splitIndex = withoutScheme.indexOf("/")
    if (splitIndex === -1) return url
    const bucket = withoutScheme.substring(0, splitIndex)
    const key = withoutScheme.substring(splitIndex + 1)

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  } catch (err) {
    console.error("Failed to generate presigned URL for transcript:", err)
    return url
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const jobName = String(searchParams.get("jobName") || "").trim()

    if (!jobName) {
      return NextResponse.json({ error: "jobName is required" }, { status: 400 })
    }

    const job = await getWhisperJob(jobName)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const status = job.status === "QUEUED" ? "IN_PROGRESS" : job.status
    const transcriptUrl = job.status === "COMPLETED" ? `/api/transcribe/result?jobName=${encodeURIComponent(jobName)}` : null
    const failureReason = job.failureReason

    const finalTranscriptUrl = await maybeSignTranscriptUrl(transcriptUrl)

    return NextResponse.json({
      jobName,
      status,
      transcriptUrl: finalTranscriptUrl,
      failureReason,
    })
  } catch (e: any) {
    const msg = String(e?.message || "")
    const name = String(e?.name || "")
    const lower = msg.toLowerCase()
    const isCredentialError =
      name === "CredentialsProviderError" ||
      lower.includes("missing credentials") ||
      lower.includes("could not load credentials")

    console.error("Transcribe status failed:", e)

    const awsError = {
      name: e?.name,
      message: e?.message,
      requestId: e?.$metadata?.requestId,
      httpStatusCode: e?.$metadata?.httpStatusCode,
    }

    return NextResponse.json({ error: e?.message || "Failed to get transcription status", awsError }, { status: 500 })
  }
}
