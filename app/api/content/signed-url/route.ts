import { NextResponse } from "next/server"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from "@/lib/aws-clients"
import { getS3BucketName } from "@/lib/aws-config"

export const runtime = "nodejs"

function cleanKey(input: string): string {
  // Prevent path traversal-ish keys; keep it simple.
  const k = input.trim().replace(/^\/+/, "")
  return k
}

function sanitizeSegment(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_. ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const filename = String(body.filename || "").trim()
    const contentType = String(body.contentType || "application/octet-stream").trim()
    const folder = String(body.folder || "content").trim()

    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 })
    }

    const { bucket, prefix } = getS3BucketName()
    
    // Generate key
    const originalName = filename
    const safeFolder = sanitizeSegment(folder) || "content"
    const safeTitle = sanitizeSegment(originalName.replace(/\.[^/.]+$/, "")) // remove extension for title part
    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ""
    
    const baseKey = `${safeFolder}/${Date.now()}-${safeTitle}${ext}`
    const key = prefix ? `${sanitizeSegment(prefix)}/${baseKey}` : baseKey

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const url = await getSignedUrl(s3Client, cmd, { expiresIn: 3600 }) // 1 hour

    return NextResponse.json({ url, key, bucket })
  } catch (e: any) {
    console.error("Failed to sign upload URL", e)
    return NextResponse.json({ error: e.message || "Failed to sign upload URL" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const keyParam = String(url.searchParams.get("key") || "").trim()
    if (!keyParam) {
      return NextResponse.json({ error: "key is required" }, { status: 400 })
    }

    const { bucket, prefix } = getS3BucketName()
    const key = cleanKey(keyParam)

    if (prefix) {
      const safePrefix = prefix.trim().replace(/\/+$/, "")
      if (safePrefix && !key.startsWith(`${safePrefix}/`)) {
        return NextResponse.json({ error: "key is outside allowed prefix" }, { status: 403 })
      }
    }

    // Force correct Content-Type for the signed URL response to avoid "Format error" in browsers
    // if the metadata on S3 is wrong (e.g. application/octet-stream).
    let responseContentType = undefined;
    const lowerKey = key.toLowerCase();
    if (lowerKey.endsWith(".mp4")) responseContentType = "video/mp4";
    else if (lowerKey.endsWith(".webm")) responseContentType = "video/webm";
    else if (lowerKey.endsWith(".mov")) responseContentType = "video/quicktime";
    else if (lowerKey.endsWith(".mkv")) responseContentType = "video/x-matroska";
    else if (lowerKey.endsWith(".mp3")) responseContentType = "audio/mpeg";
    else if (lowerKey.endsWith(".wav")) responseContentType = "audio/wav";

    const cmd = new GetObjectCommand({ 
      Bucket: bucket, 
      Key: key,
      ResponseContentType: responseContentType,
      ResponseContentDisposition: "inline"
    })
    // 6 hours to support long video playback (range requests) and downstream Transcribe access.
    const expiresIn = 60 * 60 * 6
    const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn })

    return NextResponse.json({ url: signedUrl, expiresIn })
  } catch (e: any) {
    const awsError = {
      name: e?.name || null,
      message: e?.message || null,
      code: e?.code || null,
      statusCode: e?.$metadata?.httpStatusCode ?? null,
      requestId: e?.$metadata?.requestId ?? null,
      extendedRequestId: e?.$metadata?.extendedRequestId ?? null,
      cfId: e?.$metadata?.cfId ?? null,
    }

    return NextResponse.json({ error: e?.message || "Failed to sign URL", awsError }, { status: 500 })
  }
}
