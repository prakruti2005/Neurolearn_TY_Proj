# S3 Content Bucket Setup

This project uploads admin content files to S3 via the API route `POST /api/content/upload`.

## 1) Configure environment variables

Create `.env.local` and set either the bucket name or bucket ARN:

- `AWS_REGION` (example: `us-east-1`)
- `AWS_S3_REGION` (optional override if your bucket is in a different region)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or `AWS_PROFILE`)
- `AWS_S3_BUCKET` **or** `AWS_S3_BUCKET_ARN`

Example:

```env
AWS_REGION=us-east-1
AWS_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_ARN=arn:aws:s3:::neurolearn-content
```

### Local dev option: AWS CLI profile

If you already ran `aws configure` and have `~/.aws/credentials`, you can avoid putting keys in `.env.local`:

```env
AWS_REGION=us-east-1
AWS_S3_REGION=ap-south-1
AWS_PROFILE=default
AWS_S3_BUCKET_ARN=arn:aws:s3:::neurolearn-content
```

## 2) IAM permissions

The credentials you run the app with must be able to upload objects:

- `s3:PutObject`
- `s3:GetObject` (required to generate signed URLs for playback)
- (optional) `s3:PutObjectAcl` if you plan to make objects public via ACLs (not required by this code)

A minimal policy looks like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::neurolearn-content/*"
    }
  ]
}
```

## 3) Public access note

The upload API returns an `httpsUrl` using the standard S3 object URL format. That URL will only be directly viewable if:

- your bucket/object is publicly readable, **or**
- you serve it through CloudFront / a signed URL flow.

If you need private content access from the browser, tell me and I’ll add signed URL support.
