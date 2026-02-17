import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "us-east-1";

if (!accessKeyId || !secretAccessKey) {
    console.error("Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment.");
    process.exit(1);
}

async function check() {
    const s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey }
    });
    try {
        await s3.send(new ListBucketsCommand({}));
        console.log("[SUCCESS] AWS credentials are valid.");
    } catch (e) {
        if (e.name === "SignatureDoesNotMatch") {
             console.log("[FAILED] Signature mismatch.");
        } else if (e.name === "AccessDenied") {
             console.log("[SUCCESS-ISH] Access denied, but credentials signature appears valid.");
        } else {
             console.log(`[FAILED] ${e.name}: ${e.message}`);
        }
    }
}

async function main() {
    await check();
}

main();
