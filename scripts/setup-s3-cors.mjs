import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.AWS_SESSION_TOKEN;

const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.S3_BUCKET_NAME || "neurolearn-content";

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
