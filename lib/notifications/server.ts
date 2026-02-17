import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin"

interface SendNotificationParams {
  title: string
  body: string
  uid?: string
  broadcast?: boolean
  data?: Record<string, string>
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function sendNotification({ title, body, uid, broadcast, data }: SendNotificationParams) {
  const db = getAdminDb()
  const messaging = getAdminMessaging()

  let tokens: string[] = []
  const uidsToNotify = new Set<string>()

  if (uid) {
    const snap = await db.collection("user").doc(uid).collection("fcmTokens").get()
    tokens = snap.docs.map((d) => String(d.id)).filter(Boolean)
    uidsToNotify.add(uid)
  } else if (broadcast) {
    const snap = await db.collectionGroup("fcmTokens").get()
    tokens = snap.docs.map((d) => String(d.id)).filter(Boolean)
    snap.docs.forEach(d => {
        const userRef = d.ref.parent.parent
        if (userRef) uidsToNotify.add(userRef.id)
    })
  }

  // De-dup
  tokens = Array.from(new Set(tokens)).filter(Boolean)

  if (tokens.length === 0 && uidsToNotify.size === 0) {
    return { successCount: 0, failureCount: 0, tokens: 0, warning: "No targets found" }
  }

  // Save to Firestore
  if (uidsToNotify.size > 0) {
    // We use a batched write, handling limits
    // Note: If broadcast is huge (thousands of users), this naive batching might be slow or timeout.
    // For a college project it's likely fine.
    
    // We restart batch every 450 ops
    let batch = db.batch()
    let opCount = 0
    
    for (const targetUid of uidsToNotify) {
      const ref = db.collection("user").doc(targetUid).collection("notifications").doc()
      batch.set(ref, {
        title, 
        body,
        createdAt: new Date(),
        read: false,
        type: "system",
        ...data 
      })
      opCount++
      
      if (opCount >= 450) {
        await batch.commit()
        batch = db.batch()
        opCount = 0
      }
    }
    if (opCount > 0) await batch.commit()
  }

  // If no tokens to push, we still saved to firestore, so that's a partial success in a way.
  // But we return what the FCM result was.
  if (tokens.length === 0) {
     return { successCount: 0, failureCount: 0, tokens: 0 }
  }

  let successCount = 0
  let failureCount = 0

  for (const batchTokens of chunk(tokens, 500)) {
    const resp = await messaging.sendEachForMulticast({
      tokens: batchTokens,
      notification: { title, body },
      data: {
        type: "neurolearn-notification",
        ...data
      },
    })
    successCount += resp.successCount
    failureCount += resp.failureCount
  }

  return { successCount, failureCount, tokens: tokens.length }
}
