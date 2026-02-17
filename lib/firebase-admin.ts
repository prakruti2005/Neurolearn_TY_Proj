import { getApps, initializeApp, cert, App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"
import fs from "node:fs"
import path from "node:path"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Add it to .env.local (local) or your hosting provider secrets.`
    )
  }
  return value
}

function stripOptionalQuotes(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function normalizeServiceAccount(sa: any): any {
  if (sa && typeof sa === "object" && typeof sa.private_key === "string") {
    // When JSON is stored in env vars, newlines are often escaped.
    sa.private_key = sa.private_key.replace(/\\n/g, "\n")
  }
  return sa
}

function getServiceAccount(): any {
  // Preferred on Windows/local dev: point to the JSON file.
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
  const googleCredsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const filePath = keyPath || googleCredsPath
  if (filePath) {
    const cleaned = stripOptionalQuotes(filePath)
    const resolvedPath = path.isAbsolute(cleaned) ? cleaned : path.join(process.cwd(), cleaned)
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Service account file not found at ${keyPath ? "FIREBASE_SERVICE_ACCOUNT_KEY_PATH" : "GOOGLE_APPLICATION_CREDENTIALS"}=${resolvedPath}. ` +
          `Use an absolute path or a path relative to the project root.`
      )
    }

    const raw = fs.readFileSync(resolvedPath, "utf8")
    return normalizeServiceAccount(JSON.parse(raw))
  }

  // Alternative: store the whole JSON as a single env var string.
  // Use FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_KEY (legacy).
  const json = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim()
  if (json) {
    return normalizeServiceAccount(JSON.parse(json))
  }

  // Base64 variant: useful on hosts that don't like multiline secrets.
  const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "").trim()
  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8")
    return normalizeServiceAccount(JSON.parse(decoded))
  }

  // Keep the old behavior for error messaging.
  const serviceAccountJson = requireEnv("FIREBASE_SERVICE_ACCOUNT_KEY")
  return normalizeServiceAccount(JSON.parse(serviceAccountJson))
}

export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0]!

  const serviceAccount = getServiceAccount()

  return initializeApp({
    credential: cert(serviceAccount),
  })
}

export function getAdminAuth() {
  const app = getFirebaseAdminApp()
  return getAuth(app)
}

export function getAdminDb() {
  const app = getFirebaseAdminApp()
  return getFirestore(app)
}

export function getAdminMessaging() {
  const app = getFirebaseAdminApp()
  return getMessaging(app)
}
