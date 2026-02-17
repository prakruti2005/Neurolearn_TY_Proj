import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws-clients"
import { getAdminDb } from "@/lib/firebase-admin"
import { getS3BucketName, getS3Region, buildPublicS3ObjectUrl } from "@/lib/aws-config"
import { requireAdminFromRequest } from "@/lib/admin-auth"

export const runtime = "nodejs"

const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"])

function titleFromKey(key: string): string {
  const base = key.split("/").pop() || key
  const noExt = base.replace(/\.[^/.]+$/, "")
  return noExt.replace(/[-_]+/g, " ").trim() || "Untitled"
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminFromRequest(req)
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const { bucket, prefix } = getS3BucketName()
    const region = getS3Region()
    const listPrefix = prefix ? prefix.replace(/\/+$/, "") + "/" : undefined

    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: listPrefix,
      MaxKeys: 200,
    })

    const resp = await s3Client.send(cmd)
    const contents = resp.Contents || []

    const db = getAdminDb()

    let created = 0
    let skipped = 0

    for (const obj of contents) {
      const key = String(obj.Key || "").trim()
      if (!key) continue

      const lower = key.toLowerCase()
      const ext = lower.slice(lower.lastIndexOf("."))
      if (!VIDEO_EXTS.has(ext)) continue

      const existing = await db
        .collection("courses")
        .where("assetKey", "==", key)
        .limit(1)
        .get()

      const existingAlt = existing.empty
        ? await db.collection("courses").where("s3Key", "==", key).limit(1).get()
        : existing

      if (!existingAlt.empty) {
        skipped++
        continue
      }

      const assetUrl = buildPublicS3ObjectUrl({ bucket, region, key })

      await db.collection("courses").add({
        title: titleFromKey(key),
        description: "Uploaded video",
        assetKey: key,
        assetUrl,
        bucket,
        s3Key: key,
        s3Bucket: bucket,
        createdAt: new Date(),
        type: "Course",
        status: "Published",
        contentType: "video/mp4",
        size: obj.Size || 0,
      })

      created++
    }

    return NextResponse.json({ created, skipped, total: contents.length })
  } catch (e: any) {
    const awsError = {
      name: e?.name || null,
      message: e?.message || null,
      statusCode: e?.$metadata?.httpStatusCode ?? null,
      requestId: e?.$metadata?.requestId ?? null,
    }

    return NextResponse.json({ error: e?.message || "Failed to sync content", awsError }, { status: 500 })
  }
}
