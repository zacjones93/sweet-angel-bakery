#!/bin/bash

# Script to create R2 bucket for product images

BUCKET_NAME="sweet-angel-bakery-images"

echo "Creating R2 bucket: $BUCKET_NAME"

# Create the bucket
pnpm wrangler r2 bucket create $BUCKET_NAME

# Enable public access (optional - you can also use custom domain)
echo ""
echo "Bucket created successfully!"
echo ""
echo "To make images publicly accessible, you have two options:"
echo ""
echo "1. Use Cloudflare R2 custom domain (recommended):"
echo "   - Go to Cloudflare Dashboard > R2 > $BUCKET_NAME"
echo "   - Click 'Settings' > 'Public Access'"
echo "   - Add a custom domain or enable R2.dev subdomain"
echo ""
echo "2. Or use Workers to serve images through your Next.js app"
echo ""
echo "After setting up public access, update the URL in:"
echo "  src/utils/upload-image.ts (line 34)"

