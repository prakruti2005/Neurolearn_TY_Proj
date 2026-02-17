import { NextResponse } from "next/server"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws-clients"
import { getS3BucketName } from "@/lib/aws-config"

export const runtime = "nodejs"

function cleanKey(input: string): string {
  return input.trim().replace(/^\/+/, "")
}

function titleFromKey(key: string): string {
  const base = key.split("/").pop() || key
  const noExt = base.replace(/\.[^/.]+$/, "")
  return noExt.replace(/[-_]+/g, " ").trim() || "Untitled"
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

    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    return NextResponse.json({
      id: key,
      title: titleFromKey(key),
      description: "Uploaded video",
      duration: "N/A",
      level: "General",
      tags: ["video"],
      assetKey: key,
      bucket,
      size: head.ContentLength || 0,
      lastModified: head.LastModified ? head.LastModified.toISOString() : null,
      contentType: head.ContentType || null,
    })
  } catch (e: any) {
    const name = String(e?.name || "")
    if (name === "NotFound" || name === "NoSuchKey") {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const awsError = {
      name: e?.name || null,
      message: e?.message || null,
      statusCode: e?.$metadata?.httpStatusCode ?? null,
      requestId: e?.$metadata?.requestId ?? null,
    }

    return NextResponse.json({ error: e?.message || "Failed to get content", awsError }, { status: 500 })
  }
}
