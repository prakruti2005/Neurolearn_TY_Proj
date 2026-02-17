import { NextResponse } from "next/server"
import { DetectLabelsCommand } from "@aws-sdk/client-rekognition"
import { rekognitionClient } from "@/lib/aws-clients"

export const runtime = "nodejs"

function decodeBase64Image(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input
  const buf = Buffer.from(cleaned, "base64")
  return new Uint8Array(buf)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const imageBase64 = body?.imageBase64 ? String(body.imageBase64).trim() : ""
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : ""
    const maxLabels = Number.isFinite(Number(body?.maxLabels)) ? Number(body.maxLabels) : 10
    const minConfidence = Number.isFinite(Number(body?.minConfidence)) ? Number(body.minConfidence) : 60

    let bytes: Uint8Array | null = null

    if (imageBase64) {
      bytes = decodeBase64Image(imageBase64)
    } else if (imageUrl) {
      const resp = await fetch(imageUrl)
      if (!resp.ok) {
        return NextResponse.json({ error: `Failed to fetch imageUrl (${resp.status})` }, { status: 400 })
      }
      const arr = await resp.arrayBuffer()
      bytes = new Uint8Array(arr)
    } else {
      return NextResponse.json({ error: "imageBase64 or imageUrl is required" }, { status: 400 })
    }

    const cmd = new DetectLabelsCommand({
      Image: { Bytes: bytes },
      MaxLabels: Math.min(Math.max(maxLabels, 1), 50),
      MinConfidence: Math.min(Math.max(minConfidence, 0), 100),
    })

    const result = await rekognitionClient.send(cmd)
    return NextResponse.json({ labels: result.Labels || [] })
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (msg.toLowerCase().includes("credential") || msg.toLowerCase().includes("access key") || msg.toLowerCase().includes("secret")) {
      return NextResponse.json(
        {
          error:
            "AWS credentials are not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in .env.local (or your host secrets).",
        },
        { status: 503 }
      )
    }

    console.error("Rekognition labels failed:", e)
    return NextResponse.json({ error: e?.message || "Failed to analyze image" }, { status: 500 })
  }
}
