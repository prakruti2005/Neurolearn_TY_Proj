import { NextResponse } from "next/server"

export const runtime = "nodejs"

function boolEnv(name: string): boolean {
  const v = process.env[name]
  return Boolean(v && String(v).trim())
}

export async function GET() {
  return NextResponse.json({
    hasAccessKey: boolEnv("AWS_ACCESS_KEY_ID"),
    hasSecretKey: boolEnv("AWS_SECRET_ACCESS_KEY"),
    hasSessionToken: boolEnv("AWS_SESSION_TOKEN"),
    hasRegion: boolEnv("AWS_REGION"),
    hasS3Region: boolEnv("AWS_S3_REGION"),
    hasTranscribeRegion: boolEnv("AWS_TRANSCRIBE_REGION"),
    hasBucket: boolEnv("AWS_S3_BUCKET") || boolEnv("AWS_S3_BUCKET_ARN"),
    nodeEnv: process.env.NODE_ENV || "unknown",
  })
}
