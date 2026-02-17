import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export type AdminCheckResult =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string }

export async function requireAdminFromRequest(req: Request): Promise<AdminCheckResult> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization Bearer token" }
  }

  const idToken = header.slice("Bearer ".length).trim()

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const uid = decoded.uid

    // Check the Firestore profile role (preferred collection name is `user`)
    const db = getAdminDb()
    const snap = await db.collection("user").doc(uid).get()

    const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined
    const claimRole = (decoded as any)?.role as string | undefined
    const claimAdmin = Boolean((decoded as any)?.admin)

    if (role !== "admin" && claimRole !== "admin" && !claimAdmin) {
      // Fallback: some setups use a `users` collection instead of `user`.
      const altSnap = await db.collection("users").doc(uid).get()
      const altRole = altSnap.exists ? (altSnap.data()?.role as string | undefined) : undefined
      if (altRole !== "admin") {
        return { ok: false, status: 403, error: "Admin privileges required" }
      }
    }

    return { ok: true, uid }
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (
      msg.includes("Missing env var FIREBASE_SERVICE_ACCOUNT_KEY") ||
      msg.includes("FIREBASE_SERVICE_ACCOUNT_KEY_PATH") ||
      msg.includes("GOOGLE_APPLICATION_CREDENTIALS") ||
      msg.includes("Service account file not found")
    ) {
      return {
        ok: false,
        status: 503,
        error:
          "Admin backend is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH (recommended on Windows) or GOOGLE_APPLICATION_CREDENTIALS to a real service-account JSON path, OR set FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_BASE64 in .env.local (or host secrets).",
      }
    }
    return { ok: false, status: 401, error: e?.message || "Invalid token" }
  }
}
