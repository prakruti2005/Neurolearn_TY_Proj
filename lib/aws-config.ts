const DEFAULT_REGION = "us-east-1";

export function getAwsRegion(): string {
  return process.env.AWS_REGION || DEFAULT_REGION;
}

export function getS3Region(): string {
  // S3 buckets are region-scoped; if AWS_REGION is set for other services, allow overriding just for S3.
  return process.env.AWS_S3_REGION || getAwsRegion();
}

function parseS3BucketArn(arn: string): { bucket: string; prefix?: string } | null {
  // Expected bucket ARN form: arn:aws:s3:::bucket-name[/optional-prefix]
  // Note: region/account are not present in bucket ARNs.
  const trimmed = arn.trim();
  const match = /^arn:aws:s3:::(\s*[^/\s]+)(?:\/(.+))?$/i.exec(trimmed);
  const bucket = match?.[1]?.trim();
  if (!bucket) return null;
  const prefix = match?.[2]?.trim();
  return prefix ? { bucket, prefix } : { bucket };
}

export function getS3BucketName(): { bucket: string; prefix?: string } {
  const explicitBucket = (process.env.AWS_S3_BUCKET || "").trim();
  if (explicitBucket) return { bucket: explicitBucket };

  const arn = (process.env.AWS_S3_BUCKET_ARN || "").trim();
  if (arn) {
    const parsed = parseS3BucketArn(arn);
    if (parsed) return parsed;
  }

  // Repo default (kept for convenience)
  return { bucket: "neurolearn-content" };
}

export function buildPublicS3ObjectUrl(params: { bucket: string; key: string; region?: string }): string {
  const region = params.region || getS3Region();
  // For us-east-1, the classic endpoint omits region.
  const host = region === "us-east-1" ? `${params.bucket}.s3.amazonaws.com` : `${params.bucket}.s3.${region}.amazonaws.com`;
  const encodedKey = encodeURIComponent(params.key).replace(/%2F/g, "/");
  return `https://${host}/${encodedKey}`;
}
