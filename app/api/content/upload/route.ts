import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws-clients"
import { buildPublicS3ObjectUrl, getS3Region, getS3BucketName } from "@/lib/aws-config"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function boolEnv(name: string): boolean {
  const v = process.env[name]
  return Boolean(v && String(v).trim())
}

function buildAwsConfigDiagnostic() {
  const hasProfile = boolEnv("AWS_PROFILE")
  const hasAccessKey = boolEnv("AWS_ACCESS_KEY_ID")
  const hasSecretKey = boolEnv("AWS_SECRET_ACCESS_KEY")
  const hasSessionToken = boolEnv("AWS_SESSION_TOKEN")
  const hasRegion = boolEnv("AWS_REGION")
  const hasBucket = boolEnv("AWS_S3_BUCKET") || boolEnv("AWS_S3_BUCKET_ARN")

  return {
    hasProfile,
    hasAccessKey,
    hasSecretKey,
    hasSessionToken,
    hasRegion,
    hasBucket,
  }
}

function isCredentialError(e: any): boolean {
  const msg = String(e?.message || "").toLowerCase()
  const name = String(e?.name || "").toLowerCase()
  return (
    name.includes("credential") ||
    msg.includes("credential") ||
    msg.includes("access key") ||
    msg.includes("secret") ||
    msg.includes("invalidaccesskeyid") ||
    msg.includes("signaturedoesnotmatch") ||
    msg.includes("expiredtoken")
  )
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
  // Handle content upload (Metadata or File)
  try {
    const contentType = req.headers.get("content-type") || ""
    
    let isMetadataOnly = false
    let bodyJson: any = {}
    
    if (contentType.includes("application/json")) {
      isMetadataOnly = true
      bodyJson = await req.json()
    }

    let httpsUrl = ""
    let key = ""
    let bucket = ""
    let region = getS3Region()
    let title = ""
    let description = ""
    let mimeType = ""
    let size = 0

    if (isMetadataOnly) {
      // Handling pre-uploaded file (via presigned URL)
      key = String(bodyJson.key || "").trim()
      bucket = String(bodyJson.bucket || "").trim()
      title = String(bodyJson.title || "").trim()
      description = String(bodyJson.description || "").trim()
      mimeType = String(bodyJson.contentType || "application/octet-stream")
      size = Number(bodyJson.size || 0)
      
      if (!key || !bucket) {
        return NextResponse.json({ error: "key and bucket are required for metadata-only mode" }, { status: 400 })
      }
      
      httpsUrl = buildPublicS3ObjectUrl({ bucket, region, key })
    } else {
      const form = await req.formData()
  
      const file = form.get("file")
      title = String(form.get("title") || "").trim()
      description = String(form.get("description") || "").trim()
      const folder = String(form.get("folder") || "content").trim() || "content"
  
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 })
      }
  
      region = getS3Region()
      const bucketConfig = getS3BucketName()
      bucket = bucketConfig.bucket
      const prefix = bucketConfig.prefix
  
      const originalName = file.name || "upload"
      const safeTitle = sanitizeSegment(title || originalName)
      const safeFolder = sanitizeSegment(folder) || "content"
  
      const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ""
      const baseKey = `${safeFolder}/${Date.now()}-${safeTitle}${ext}`
      key = prefix ? `${sanitizeSegment(prefix)}/${baseKey}` : baseKey
  
      const body = Buffer.from(await file.arrayBuffer())
      mimeType = file.type || "application/octet-stream"
      size = file.size
  
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: mimeType,
        })
      )
  
      httpsUrl = buildPublicS3ObjectUrl({ bucket, region, key })
    }

    // Store metadata in Firestore
    try {
      const db = getAdminDb()
      const isText = mimeType.startsWith("text/") || 
                     mimeType.includes("json") || 
                     mimeType.includes("csv") ||
                     (title.toLowerCase().endsWith(".txt") || 
                      title.toLowerCase().endsWith(".md"))

      const docRef = await db.collection("courses").add({
        title: title || "Untitled Content",
        description,
        assetUrl: httpsUrl,
        assetKey: key,
        bucket,
        s3Key: key, 
        s3Bucket: bucket,
        createdAt: new Date(),
        type: isText ? "Document" : "Video", 
        status: "Processing",
        contentType: mimeType,
        size: size,
        metadata: {
            processingStatus: "pending"
        }
      })
      
      return NextResponse.json({ 
          success: true, 
          url: httpsUrl, 
          id: docRef.id,
          message: "Upload successful" 
      })

    } catch (e: any) {
        console.error("Firestore error:", e)
        return NextResponse.json(
          {
            error: "File uploaded to S3 but Firestore metadata creation failed: " + e.message,
            url: httpsUrl,
            key,
            bucket,
          },
          { status: 500 }
        )
    }
  } catch (e: any) {
    if (isCredentialError(e)) {
      const diag = buildAwsConfigDiagnostic()
      const missing: string[] = []
      if (!diag.hasRegion) missing.push("AWS_REGION")
      if (!diag.hasBucket) missing.push("AWS_S3_BUCKET or AWS_S3_BUCKET_ARN")
      if (!(diag.hasProfile || (diag.hasAccessKey && diag.hasSecretKey))) {
        missing.push("AWS_PROFILE OR (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)")
      }

      const missingStr = missing.length ? ` Missing: ${missing.join(", ")}.` : ""
      const whereStr = " Put them in .env.local (project root) or your host secrets, then restart the dev server."
      
      return NextResponse.json({ error: "AWS Credentials Error. " + e.message + missingStr + whereStr }, { status: 503 })
    }

    console.error(e)
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 })
  }
}
