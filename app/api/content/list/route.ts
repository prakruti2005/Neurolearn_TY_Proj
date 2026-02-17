import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws-clients"
import { getS3BucketName } from "@/lib/aws-config"

export const runtime = "nodejs"

const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"])

function titleFromKey(key: string): string {
  const base = key.split("/").pop() || key
  const noExt = base.replace(/\.[^/.]+$/, "")
  return noExt.replace(/[-_]+/g, " ").trim() || "Untitled"
}

export async function GET() {
  try {
    const { bucket, prefix } = getS3BucketName()

    const listPrefix = prefix ? prefix.replace(/\/+$/, "") + "/" : undefined

    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: listPrefix,
      MaxKeys: 200,
    })

    const resp = await s3Client.send(cmd)
    const items = (resp.Contents || [])
      .filter((o) => Boolean(o.Key))
      .filter((o) => {
        const key = String(o.Key || "").toLowerCase()
        const ext = key.slice(key.lastIndexOf("."))
        return VIDEO_EXTS.has(ext)
      })
      .sort((a, b) => {
        const at = a.LastModified ? a.LastModified.getTime() : 0
        const bt = b.LastModified ? b.LastModified.getTime() : 0
        return bt - at
      })
      .map((o) => {
        const key = String(o.Key || "")
        return {
          id: key,
          title: titleFromKey(key),
          description: "Uploaded video",
          duration: "N/A",
          level: "General",
          tags: ["video"],
          assetKey: key,
          bucket,
          size: o.Size || 0,
          lastModified: o.LastModified ? o.LastModified.toISOString() : null,
        }
      })

    return NextResponse.json({ items })
  } catch (e: any) {
    const awsError = {
      name: e?.name || null,
      message: e?.message || null,
      statusCode: e?.$metadata?.httpStatusCode ?? null,
      requestId: e?.$metadata?.requestId ?? null,
    }

    return NextResponse.json({ error: e?.message || "Failed to list content", awsError }, { status: 500 })
  }
}
