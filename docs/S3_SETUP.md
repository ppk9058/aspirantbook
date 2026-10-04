# AWS S3 Setup Guide

## Overview

This guide explains how to set up AWS S3 for file storage in the aspirantbook platform.

## AWS S3 Configuration

### 1. Create AWS Account

If you don't have an AWS account:
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the registration process

### 2. Create S3 Bucket

1. Go to AWS Console → S3
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `aspirantbook` (or your preferred name)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block Public Access**: Keep enabled (we'll use presigned URLs)
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable server-side encryption (AES-256)

4. Click "Create bucket"

### 3. Create IAM User

1. Go to AWS Console → IAM → Users
2. Click "Add users"
3. User name: `aspirantbook-uploader`
4. Access type: "Programmatic access"
5. Permissions: Attach policies directly
   - `AmazonS3FullAccess` (or create custom policy below)
6. Create user and **save credentials**:
   - Access Key ID
   - Secret Access Key

### 4. Custom IAM Policy (Recommended)

For better security, create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aspirantbook/*",
        "arn:aws:s3:::aspirantbook"
      ]
    }
  ]
}
```

### 5. Configure CORS (for browser uploads)

In your S3 bucket → Permissions → CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Environment Variables

Add to your `.env.local`:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=aspirantbook
```

## Folder Structure

The S3 bucket will have the following structure:

```
aspirantbook/
├── videos/
│   ├── 1234567890-abc123-lecture1.mp4
│   └── 1234567891-def456-lecture2.mp4
├── documents/
│   ├── 1234567892-ghi789-slides.pdf
│   └── 1234567893-jkl012-resources.pdf
├── images/
│   ├── 1234567894-mno345-thumbnail.jpg
│   └── 1234567895-pqr678-profile.png
└── datasets/
    ├── 1234567896-stu901-data.csv
    └── 1234567897-vwx234-sample.json
```

## Usage in Code

### Upload a File

```typescript
import { uploadToS3 } from '@/lib/s3'

const file = formData.get('file') as File
const { url, key } = await uploadToS3(file, 'video')
console.log('File uploaded:', url)
```

### Delete a File

```typescript
import { deleteFromS3 } from '@/lib/s3'

await deleteFromS3('videos/1234567890-abc123-lecture1.mp4')
```

### Get Presigned URL (for private files)

```typescript
import { getPresignedUrl } from '@/lib/s3'

const url = await getPresignedUrl('videos/private-lecture.mp4', 3600) // 1 hour expiry
console.log('Presigned URL:', url)
```

## File Type Configurations

| Type | Max Size | Allowed Types | Folder |
|------|----------|---------------|--------|
| **video** | 500MB | mp4, webm, quicktime | videos/ |
| **pdf** | 50MB | pdf | documents/ |
| **image** | 10MB | jpeg, png, webp, gif | images/ |
| **dataset** | 100MB | csv, json, zip | datasets/ |

## API Endpoints

### Upload File

```bash
POST /api/upload
Content-Type: multipart/form-data

file: <File>
type: video|pdf|image|dataset
courseId: <optional>
chapterId: <optional>
```

Response:
```json
{
  "success": true,
  "upload": {
    "id": "upload_id",
    "url": "https://aspirantbook.s3.amazonaws.com/videos/...",
    "key": "videos/...",
    "fileName": "lecture1.mp4",
    "fileSize": 12345678
  }
}
```

### Delete File

```bash
DELETE /api/upload?id=upload_id
```

## Production Considerations

### 1. CloudFront CDN (Recommended)

For better performance, set up CloudFront:

1. Go to AWS Console → CloudFront
2. Create distribution
3. Origin: Your S3 bucket
4. Update `cdnUrl` in ContentUpload records

### 2. Lifecycle Policies

Set up lifecycle rules to manage storage costs:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldRawVideos",
      "Status": "Enabled",
      "Prefix": "videos/raw/",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### 3. Video Transcoding

For video files, consider using AWS MediaConvert or similar service to:
- Generate multiple quality levels (1080p, 720p, 480p)
- Create HLS playlists for adaptive streaming
- Generate thumbnails

### 4. Monitoring

Set up CloudWatch alarms for:
- Storage usage
- Request count
- Error rates
- Data transfer costs

## Cost Estimation

**S3 Storage** (us-east-1):
- $0.023 per GB/month for first 50 TB
- Example: 1 TB = ~$23/month

**Data Transfer**:
- First 100 GB/month: Free
- Next 10 TB: $0.09 per GB
- Example: 1 TB transfer = ~$90/month

**Requests**:
- PUT/POST: $0.005 per 1,000 requests
- GET: $0.0004 per 1,000 requests

## Troubleshooting

### Access Denied Errors

1. Check IAM user permissions
2. Verify bucket policy
3. Check CORS configuration

### Slow Uploads

1. Enable multipart upload for large files
2. Use CloudFront for downloads
3. Consider using S3 Transfer Acceleration

### File Not Found

1. Verify S3 key is correct
2. Check bucket name in environment variables
3. Ensure file was uploaded successfully

## Alternative: Local Storage (Development)

For local development without AWS:

```typescript
// lib/storage.ts
export async function uploadFile(file: File) {
  // Save to public/uploads directory
  const path = `/uploads/${Date.now()}-${file.name}`
  // ... save logic
  return { url: path, key: path }
}
```

## Security Best Practices

1. ✅ Never commit AWS credentials to Git
2. ✅ Use IAM roles for EC2/Lambda instead of access keys
3. ✅ Enable bucket versioning for recovery
4. ✅ Use presigned URLs for private content
5. ✅ Set up bucket logging for audit trails
6. ✅ Enable MFA delete for production buckets
7. ✅ Regularly rotate access keys
8. ✅ Use VPC endpoints for private access

## Next Steps

1. Set up AWS account and S3 bucket
2. Configure environment variables
3. Test file upload via API
4. Implement video transcoding (optional)
5. Set up CloudFront CDN (recommended)
6. Configure lifecycle policies
7. Set up monitoring and alerts
