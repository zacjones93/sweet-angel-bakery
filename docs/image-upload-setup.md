# Image Upload Setup Guide

This guide explains how to set up and use the Cloudflare R2 image upload functionality for product images.

## Overview

The application uses Cloudflare R2 (object storage) to store product images. Images are uploaded through a drag-and-drop interface in the admin panel and served through the Next.js application.

## Architecture

1. **Upload Flow**:

   - User selects/drops an image file in the product form
   - Client validates file type and size
   - File is sent to `/api/upload-image` endpoint
   - Server uploads to R2 bucket with unique filename
   - URL is returned and stored in the database

2. **Serving Flow**:
   - Images are served through `/api/images/[...path]` route
   - Route fetches from R2 and returns with proper headers
   - Next.js Image component optimizes delivery

## Setup Instructions

### 1. Create the R2 Bucket

Run the provided script to create the R2 bucket:

```bash
./scripts/create-r2-bucket.sh
```

Or manually create it:

```bash
pnpm wrangler r2 bucket create sweet-angel-bakery-images
```

### 2. Configure Public Access (Optional)

You have three options for serving images:

#### Option A: Through Next.js API Route (Current Default)

- Images are served through `/api/images/[...path]`
- No additional setup required
- Works out of the box
- Best for starting out

#### Option B: R2 Custom Domain (Recommended for Production)

1. Go to Cloudflare Dashboard > R2 > `sweet-angel-bakery-images`
2. Click "Settings" > "Public Access"
3. Connect a custom domain (e.g., `images.yourdomain.com`)
4. Update `src/utils/upload-image.ts` line 46:
   ```typescript
   const url = `https://images.yourdomain.com/${key}`;
   ```

#### Option C: R2.dev Subdomain

1. Go to Cloudflare Dashboard > R2 > `sweet-angel-bakery-images`
2. Click "Settings" > "Public Access"
3. Enable "R2.dev subdomain"
4. Copy the public URL (e.g., `https://pub-xxxxx.r2.dev`)
5. Update `src/utils/upload-image.ts` line 46:
   ```typescript
   const url = `https://pub-xxxxx.r2.dev/${key}`;
   ```

### 3. Deploy

After creating the bucket, deploy your application:

```bash
pnpm run deploy
```

The R2 bucket binding will be automatically configured based on `wrangler.jsonc`.

## Usage

### In the Admin Panel

1. Navigate to `/admin/products/new` or edit an existing product
2. Click or drag an image file to the upload area
3. Supported formats: JPEG, PNG, WebP
4. Maximum file size: 5MB
5. Image will be automatically uploaded and previewed
6. Click the X button to remove and upload a different image

### File Validation

The system validates:

- **File types**: Only JPEG, PNG, and WebP are allowed
- **File size**: Maximum 5MB per image
- **User permissions**: Only admins can upload images

### File Organization

Uploaded images are stored in R2 with the following structure:

```
products/
  ├── cuid2-id-1.jpg
  ├── cuid2-id-2.png
  └── cuid2-id-3.webp
```

Each file gets a unique CUID2 identifier to prevent collisions.

## Code Structure

### Key Files

- `src/utils/upload-image.ts` - Core upload/delete logic
- `src/app/api/upload-image/route.ts` - Upload API endpoint
- `src/app/api/images/[...path]/route.ts` - Image serving endpoint
- `src/app/(admin)/admin/products/_components/product-form.tsx` - Upload UI
- `wrangler.jsonc` - R2 bucket configuration

### Configuration

R2 bucket binding in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "PRODUCT_IMAGES",
    "bucket_name": "sweet-angel-bakery-images"
  }
]
```

## Development

### Local Development

For local development, the application uses the Cloudflare Workers runtime emulation. Make sure you have:

1. Created the R2 bucket (even for local dev)
2. Run `pnpm run dev` to start the development server
3. Upload functionality will work locally through the emulated R2

### Testing

To test the upload functionality:

1. Start the dev server: `pnpm run dev`
2. Sign in as an admin user
3. Navigate to `/admin/products/new`
4. Try uploading a test image
5. Check the console for any errors
6. Verify the image displays in the preview

## Troubleshooting

### "Bucket not found" Error

- Make sure the R2 bucket is created: `pnpm wrangler r2 bucket list`
- Verify the bucket name in `wrangler.jsonc` matches the created bucket

### Images Not Displaying

- Check if the API route `/api/images/[...path]` is working
- Verify the image URL format in the database
- Check browser console for CORS or network errors

### Upload Fails

- Verify you're logged in as an admin
- Check file size (must be under 5MB)
- Verify file type (JPEG, PNG, or WebP only)
- Check browser console for detailed error messages

### TypeScript Errors

- Run `pnpm run cf-typegen` to regenerate Cloudflare types
- Restart your TypeScript server in your IDE

## Security Considerations

- Only authenticated admin users can upload images
- File types are strictly validated on both client and server
- File sizes are limited to prevent abuse
- Unique filenames prevent collisions and guessing
- Images are validated before upload to R2

## Performance

- Images are cached with `Cache-Control: public, max-age=31536000, immutable`
- Next.js Image component provides automatic optimization
- R2 serves files from Cloudflare's global network
- Consider using a custom domain for best performance

## Cost Considerations

Cloudflare R2 pricing (as of 2024):

- Storage: $0.015/GB per month
- Class A operations (uploads): $4.50 per million
- Class B operations (downloads): $0.36 per million
- **No egress fees** (unlike AWS S3)

For a typical bakery website with ~100 products:

- Storage: ~1GB = $0.015/month
- Uploads: ~100/month = negligible
- Downloads: ~10,000/month = negligible

**Estimated cost: < $1/month**
