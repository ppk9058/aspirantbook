# AWS S3 Setup Guide for aspirantbook

## Prerequisites

You need an AWS account. If you don't have one, sign up at https://aws.amazon.com/free/

## Step 1: Create an S3 Bucket

1. Go to AWS Console: https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. **Bucket name**: Choose a unique name (e.g., `aspirantbook-uploads`)
4. **Region**: Select `us-east-1` (or your preferred region)
5. **Block Public Access**: UNCHECK "Block all public access"
   - Check the acknowledgment box
6. **Bucket Versioning**: Disabled (optional)
7. Click "Create bucket"

## Step 2: Configure Bucket CORS

1. Select your bucket
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit" and paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
        "ExposeHeaders": ["ETag"]
    }
]
```

5. Click "Save changes"

## Step 3: Create IAM User for Programmatic Access

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. **User name**: `aspirantbook-uploader`
4. Click "Next"
5. **Permissions**: Select "Attach policies directly"
6. Search and select `AmazonS3FullAccess` (or create custom policy below)
7. Click "Next" → "Create user"

### Custom Policy (Recommended - More Secure)

Instead of `AmazonS3FullAccess`, create a custom policy:

1. In IAM, go to "Policies" → "Create policy"
2. Click "JSON" and paste:

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
                "arn:aws:s3:::YOUR-BUCKET-NAME/*",
                "arn:aws:s3:::YOUR-BUCKET-NAME"
            ]
        }
    ]
}
```

3. Replace `YOUR-BUCKET-NAME` with your actual bucket name
4. Click "Next" → Name it `aspirantbookS3Policy` → "Create policy"
5. Attach this policy to your user

## Step 4: Create Access Keys

1. Go to your user (`aspirantbook-uploader`)
2. Click "Security credentials" tab
3. Scroll to "Access keys"
4. Click "Create access key"
5. Select "Application running outside AWS"
6. Click "Next" → "Create access key"
7. **IMPORTANT**: Copy both:
   - Access key ID
   - Secret access key
   (You won't be able to see the secret again!)

## Step 5: Update Environment Variables

Add these to your `.env.local` file:

```bash
# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_S3_BUCKET_NAME=aspirantbook-uploads
```

Replace with your actual values from Step 4.

## Step 6: (Optional) Set up CloudFront CDN

For faster content delivery:

1. Go to CloudFront Console: https://console.aws.amazon.com/cloudfront/
2. Click "Create distribution"
3. **Origin domain**: Select your S3 bucket
4. **Origin access**: "Origin access control settings (recommended)"
5. Click "Create new OAC" → "Create"
6. **Viewer protocol policy**: "Redirect HTTP to HTTPS"
7. Click "Create distribution"
8. Copy the **Distribution domain name** (e.g., `d111111abcdef8.cloudfront.net`)
9. Add to `.env.local`:

```bash
AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
```

10. Update S3 bucket policy (CloudFront will prompt you)

## Step 7: Test the Setup

1. Restart your dev server:
```bash
npm run dev
```

2. Go to admin panel and try uploading an image
3. Check your S3 bucket to verify the file was uploaded

## Troubleshooting

### CORS Errors
- Verify CORS configuration in S3 bucket
- Check that your domain is in `AllowedOrigins`

### Access Denied
- Verify IAM user has correct permissions
- Check bucket policy allows your IAM user

### Files Not Uploading
- Check AWS credentials in `.env.local`
- Verify bucket name is correct
- Check browser console for errors

## Security Best Practices

1. ✅ Use IAM user with minimal permissions (not root account)
2. ✅ Never commit `.env.local` to git
3. ✅ Rotate access keys periodically
4. ✅ Use CloudFront for production (caching + HTTPS)
5. ✅ Set up bucket lifecycle rules to delete old files
6. ✅ Enable S3 server-side encryption

## Cost Estimation

AWS Free Tier (12 months):
- 5GB storage
- 20,000 GET requests
- 2,000 PUT requests per month

After free tier:
- Storage: ~$0.023/GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Estimated cost for small app**: $1-5/month

## Next Steps

Once AWS is configured, you can:
1. Create courses with thumbnail uploads
2. Add chapters and lessons with video uploads
3. Create assessments and tutorials
4. All files will be stored in your S3 bucket
