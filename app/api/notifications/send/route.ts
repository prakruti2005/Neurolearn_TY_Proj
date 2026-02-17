import { NextResponse } from "next/server"
import { requireAdminFromRequest } from "@/lib/admin-auth"
import { sendNotification } from "@/lib/notifications/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const adminCheck = await requireAdminFromRequest(req)
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const title = String(body?.title || "").trim()
    const messageBody = String(body?.body || "").trim()
    const uid = body?.uid ? String(body.uid).trim() : undefined
    const broadcast = Boolean(body?.broadcast)

    if (!title || !messageBody) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 })
    }

    if (!uid && !broadcast) {
      return NextResponse.json({ error: "Provide uid or set broadcast=true" }, { status: 400 })
    }

    const start = Date.now()
    const result = await sendNotification({
      title,
      body: messageBody,
      uid,
      broadcast
    })

    console.log(`Notification sent in ${Date.now() - start}ms`, result)

    if (result.warning && result.tokens === 0) {
       // It means no tokens found, but maybe no users found either.
       // We'll return 404 if it was a targeted UID and we found nothing.
       if (uid) return NextResponse.json({ error: "User not found or has no tokens" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (
      msg.includes("Missing env var FIREBASE_SERVICE_ACCOUNT_KEY") ||
      msg.includes("FIREBASE_SERVICE_ACCOUNT_KEY_PATH") ||
      msg.includes("GOOGLE_APPLICATION_CREDENTIALS") ||
      msg.includes("Service account file not found")
    ) {
      return NextResponse.json(
        {
          error:
            "Admin backend is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH (recommended on Windows) or GOOGLE_APPLICATION_CREDENTIALS.",
        },
        { status: 503 }
      )
    }

    console.error("Send notification failed:", e)
    return NextResponse.json({ error: e?.message || "Failed to send notification" }, { status: 500 })
  }
}
