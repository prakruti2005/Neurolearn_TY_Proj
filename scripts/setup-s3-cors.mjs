import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseBucketFromArn(arn) {
  const match = /^arn:aws:s3:::(\s*[^/\s]+)(?:\/.*)?$/i.exec(String(arn || "").trim());
  return match?.[1]?.trim() || "";
}

loadDotEnvLocal();

// Load .env.local manually
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.AWS_SESSION_TOKEN;

const REGION = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
const BUCKET =
  (process.env.AWS_S3_BUCKET || "").trim() ||
  parseBucketFromArn(process.env.AWS_S3_BUCKET_ARN);

if (!BUCKET || !accessKeyId || !secretAccessKey) {
  console.error("Error: Credentials or Bucket missing");
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken
  }
});

async function main() {
  console.log(`Setting CORS for bucket: ${BUCKET} in ${REGION}`);

  const command = new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD", "PUT", "POST"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "Content-Type", "Content-Length", "Date", "Range"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  try {
    await s3.send(command);
    console.log("Success: CORS configuration updated.");
  } catch (err) {
    console.error("Failed to set CORS:", err);
  }
}

main();
