import { PollyClient } from "@aws-sdk/client-polly";
import { TranscribeClient } from "@aws-sdk/client-transcribe";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

function loadEnvIfMissing() {
	// If AWS env vars are missing, try to load .env.local manually (server-side only).
	if (typeof process === "undefined") return;
	const keys = [
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_SESSION_TOKEN",
		"AWS_REGION",
		"AWS_S3_REGION",
		"AWS_TRANSCRIBE_REGION",
		"AWS_S3_BUCKET",
		"AWS_S3_BUCKET_ARN",
	];

	const hasAny = keys.some((k) => Boolean(process.env[k] && String(process.env[k]).trim()));
	if (hasAny) return;

	try {
		const envPath = path.join(process.cwd(), ".env.local");
		if (!fs.existsSync(envPath)) return;
		const raw = fs.readFileSync(envPath, "utf8");
		raw.split(/\r?\n/).forEach((line) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) return;
			const eqIndex = trimmed.indexOf("=");
			if (eqIndex === -1) return;
			const key = trimmed.slice(0, eqIndex).trim();
			let value = trimmed.slice(eqIndex + 1).trim();
			if (!key) return;
			if (value.startsWith("\"") && value.endsWith("\"")) value = value.slice(1, -1);
			if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
			if (!process.env[key]) process.env[key] = value;
		});
	} catch {
		// ignore
	}
}

loadEnvIfMissing();

const REGION = process.env.AWS_REGION || "us-east-1";
const S3_REGION = process.env.AWS_S3_REGION || REGION;
const TRANSCRIBE_REGION = process.env.AWS_TRANSCRIBE_REGION || S3_REGION;

function cleanEnvValue(v: string | undefined): string | undefined {
	if (!v) return undefined;
	const trimmed = v.trim();
	if (!trimmed) return undefined;
	// Allow users to paste values with quotes in .env.local
	const unquoted = trimmed.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
	return unquoted.trim() || undefined;
}

const accessKeyId = cleanEnvValue(process.env.AWS_ACCESS_KEY_ID);
const secretAccessKey = cleanEnvValue(process.env.AWS_SECRET_ACCESS_KEY);
const sessionToken = cleanEnvValue(process.env.AWS_SESSION_TOKEN);

// Prefer explicit env keys if present (robust to accidental quoting/whitespace).
// Otherwise, fall back to the AWS SDK default credential provider chain (supports AWS_PROFILE, etc.).
const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey, sessionToken } : undefined;

export const pollyClient = new PollyClient({ region: REGION, credentials });
export const transcribeClient = new TranscribeClient({ region: TRANSCRIBE_REGION, credentials });
export const rekognitionClient = new RekognitionClient({ region: REGION, credentials });
export const s3Client = new S3Client({
	region: S3_REGION,
	credentials,
	followRegionRedirects: true,
});
