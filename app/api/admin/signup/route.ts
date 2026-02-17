import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var ${name}. Add it to .env.local (local) or your hosting provider secrets.`)
  return value
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const secret = String(body?.secret || "").trim()
    const expected = process.env.ADMIN_SIGNUP_SECRET

    if (!expected) {
      return NextResponse.json(
        { error: "Admin signup is disabled (missing ADMIN_SIGNUP_SECRET)." },
        { status: 403 }
      )
    }

    if (!secret || secret !== expected) {
      return NextResponse.json({ error: "Invalid admin signup secret." }, { status: 403 })
    }

    const email = String(body?.email || "").trim()
    const password = String(body?.password || "").trim()
    const displayName = String(body?.displayName || "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Ensure Admin SDK is configured.
    // firebase-admin.ts already supports FIREBASE_SERVICE_ACCOUNT_KEY_PATH on Windows.
    requireEnv("ADMIN_SIGNUP_SECRET")

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
      .set(
        {
          uid: created.uid,
          email: created.email,
          role: "admin",
          displayName: displayName || email.split("@")[0],
          status: "Active",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: "admin-signup",
        },
        { merge: true }
      )

    return NextResponse.json({ uid: created.uid })
  } catch (e: any) {
    console.error("Admin signup failed:", e)
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
    return NextResponse.json({ error: e?.message || "Failed to create admin" }, { status: 500 })
  }
}
