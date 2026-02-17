import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { requireAdminFromRequest } from "@/lib/admin-auth"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  const adminCheck = await requireAdminFromRequest(req)
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const body = await req.json()
    const email = String(body?.email || "").trim()
    const password = String(body?.password || "").trim()
    const displayName = String(body?.displayName || "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const auth = getAdminAuth()
    const created = await auth.createUser({
      email,
      password,
      displayName: displayName || undefined,
    })

    const db = getAdminDb()
    await db
      .collection("user")
      .doc(created.uid)
      .set({
        uid: created.uid,
        email: created.email,
        role: "teacher",
        displayName: displayName || email.split("@")[0],
        status: "Active",
        createdAt: FieldValue.serverTimestamp(),
        createdByAdminUid: adminCheck.uid,
      })

    return NextResponse.json({ uid: created.uid })
  } catch (e: any) {
    console.error("Admin create teacher failed:", e)
    const msg = String(e?.message || "")
    if (msg.includes("Missing env var FIREBASE_SERVICE_ACCOUNT_KEY") || msg.includes("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")) {
      return NextResponse.json(
        {
          error:
            "Admin backend is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH (recommended on Windows) or FIREBASE_SERVICE_ACCOUNT_KEY in .env.local.",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: e?.message || "Failed to create teacher" }, { status: 500 })
  }
}
