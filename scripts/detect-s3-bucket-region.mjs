// Run: node scripts/detect-s3-bucket-region.mjs
// Prints the bucket's actual region (needed to avoid S3 PermanentRedirect).

import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseBucketFromArn(arn) {
  // arn:aws:s3:::bucket-name[/optional-prefix]
  const m = /^arn:aws:s3:::(\s*[^/\s]+)(?:\/.*)?$/i.exec(String(arn || "").trim());
  return m?.[1]?.trim() || "";
}

async function main() {
  loadDotEnvLocal();

  const bucket = (process.env.AWS_S3_BUCKET || "").trim() || parseBucketFromArn(process.env.AWS_S3_BUCKET_ARN);
  if (!bucket) {
    console.error("Missing bucket: set AWS_S3_BUCKET or AWS_S3_BUCKET_ARN");
    process.exit(2);
  }

  // GetBucketLocation is best called against us-east-1.
  const client = new S3Client({ region: "us-east-1" });
  const out = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));

  // For us-east-1, LocationConstraint is typically null/empty.
  const loc = out?.LocationConstraint;
  const region = !loc ? "us-east-1" : loc === "EU" ? "eu-west-1" : loc;
  console.log(region);
}

main().catch((e) => {
  console.error("Failed to detect bucket region:", e?.name || e);
  console.error(e?.message || e);
  process.exit(1);
});
