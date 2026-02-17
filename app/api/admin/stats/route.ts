import { NextResponse } from "next/server"
import { requireAdminFromRequest } from "@/lib/admin-auth"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

async function countAuthUsers(): Promise<number> {
  const auth = getAdminAuth()
  let count = 0
  let nextPageToken: string | undefined

  do {
    const res = await auth.listUsers(1000, nextPageToken)
    count += res.users.length
    nextPageToken = res.pageToken
  } while (nextPageToken)

  return count
}

export async function GET(req: Request) {
  const adminCheck = await requireAdminFromRequest(req)
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const db = getAdminDb()
    const [authUsers, coursesSnap, profilesSnap] = await Promise.all([
      countAuthUsers(),
      db.collection("courses").get(),
      db.collection("user").get(),
    ])

    const userProfiles = profilesSnap.size

    return NextResponse.json({
      authUsers,
      courses: coursesSnap.size,
      userProfiles,
      users: userProfiles,
    })
  } catch (e: any) {
    console.error("Admin stats failed:", e)
    return NextResponse.json({ error: e?.message || "Failed to load stats" }, { status: 500 })
  }
}
