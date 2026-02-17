export type WhisperJobStatus = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED"

export interface WhisperJobResult {
  status: WhisperJobStatus
  transcript?: any
  failureReason?: string
}

const store = new Map<string, WhisperJobResult>()

type WhisperJobRecord = WhisperJobResult & {
  createdAt?: number
  updatedAt?: number
}

async function getDbSafe() {
  try {
    const mod = await import("@/lib/firebase-admin")
    return mod.getAdminDb()
  } catch {
    return null
  }
}

async function saveJob(jobId: string, data: WhisperJobRecord) {
  const db = await getDbSafe()
  if (!db) return

  const now = Date.now()
  const payload = {
    ...data,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  }

  await db.collection("whisperJobs").doc(jobId).set(payload, { merge: true })
}

export async function createWhisperJob(jobId: string) {
  const record: WhisperJobRecord = { status: "QUEUED", createdAt: Date.now(), updatedAt: Date.now() }
  store.set(jobId, record)
  await saveJob(jobId, record)
}

export async function updateWhisperJob(jobId: string, result: WhisperJobResult) {
  const record: WhisperJobRecord = { ...result }
  store.set(jobId, record)
  await saveJob(jobId, record)
}

export async function getWhisperJob(jobId: string): Promise<WhisperJobResult | undefined> {
  const local = store.get(jobId)
  if (local) return local

  const db = await getDbSafe()
  if (!db) return undefined

  const snap = await db.collection("whisperJobs").doc(jobId).get()
  if (!snap.exists) return undefined

  const data = snap.data() as WhisperJobRecord
  if (!data?.status) return undefined

  const result: WhisperJobResult = {
    status: data.status,
    transcript: data.transcript,
    failureReason: data.failureReason,
  }

  store.set(jobId, result)
  return result
}