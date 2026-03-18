import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { s3Client } from "@/lib/aws-clients"
import { requireAdminFromRequest } from "@/lib/admin-auth"
import { getS3BucketName } from "@/lib/aws-config"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function normalizeKey(value: unknown): string {
  return String(value || "").trim().replace(/^\/+/, "")
}

function isMissingObjectError(error: any): boolean {
  const name = String(error?.name || "")
  const code = String(error?.Code || error?.code || "")
  return name === "NoSuchKey" || name === "NotFound" || code === "NoSuchKey" || code === "NotFound"
}

function isAccessDeniedError(error: any): boolean {
  const name = String(error?.name || "")
  const code = String(error?.Code || error?.code || "")
  const message = String(error?.message || "")
  return (
    name === "AccessDenied" ||
    code === "AccessDenied" ||
    message.toLowerCase().includes("access denied")
  )
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminFromRequest(req)
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const { id } = await context.params
    const contentId = String(id || "").trim()
    if (!contentId) {
      return NextResponse.json({ error: "Content id is required" }, { status: 400 })
    }

    const db = getAdminDb()
    const docRef = db.collection("courses").doc(contentId)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const data = snapshot.data() || {}
    const key = normalizeKey(data.assetKey || data.s3Key)
    const bucket = String(data.s3Bucket || data.bucket || getS3BucketName().bucket).trim()

    let deletedAsset = false
    let assetDeleteError: string | null = null

    if (key && bucket) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        )
        deletedAsset = true
      } catch (error: any) {
        if (isMissingObjectError(error)) {
          // Object is already gone; treat as successful metadata cleanup path.
        } else if (isAccessDeniedError(error)) {
          // Allow content deletion in Firestore even if current AWS credentials cannot delete the object.
          assetDeleteError = "S3 object delete was skipped due to AccessDenied"
        } else {
          throw error
        }
      }
    }

    await docRef.delete()

    return NextResponse.json({ success: true, deletedAsset, assetDeleteError })
  } catch (e: any) {
    const awsError = {
      name: e?.name || null,
      message: e?.message || null,
      statusCode: e?.$metadata?.httpStatusCode ?? null,
      requestId: e?.$metadata?.requestId ?? null,
    }

    return NextResponse.json({ error: e?.message || "Failed to delete content", awsError }, { status: 500 })
  }
}