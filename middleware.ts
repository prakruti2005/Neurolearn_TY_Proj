import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const badPath = "/api/transcribe/start and GET /api/transcribe/status"
  const badPathEncoded = "/api/transcribe/start%20and%20GET%20/api/transcribe/status"

  if (path === badPath || path === badPathEncoded) {
    return NextResponse.json(
      {
        error: "Invalid endpoint.",
        usage: {
          start: { method: "POST", url: "/api/transcribe/start" },
          status: { method: "GET", url: "/api/transcribe/status?jobName=..." },
          result: { method: "GET", url: "/api/transcribe/result?jobName=..." },
        },
      },
      { status: 400 }
    )
  }

  return NextResponse.next()
}
