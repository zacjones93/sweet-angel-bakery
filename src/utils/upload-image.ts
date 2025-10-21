import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createId } from "@paralleldrive/cuid2";

export async function uploadProductImage({
  file,
  baseUrl,
}: {
  file: File;
  baseUrl?: string;
}): Promise<{ url: string; key: string }> {
  const { env } = await getCloudflareContext();

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("File size too large. Maximum size is 5MB.");
  }

  // Generate unique key with original extension
  const extension = file.name.split(".").pop() || "jpg";
  const key = `products/${createId()}.${extension}`;

  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Upload to R2
  await env.PRODUCT_IMAGES.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Return public URL - use absolute URL for external services like Stripe
  // If baseUrl is not provided, fall back to relative URL
  const relativePath = `/api/images/${key}`;
  const url = baseUrl ? `${baseUrl}${relativePath}` : relativePath;

  return { url, key };
}

export async function deleteProductImage({
  key,
}: {
  key: string;
}): Promise<void> {
  const { env } = await getCloudflareContext();
  await env.PRODUCT_IMAGES.delete(key);
}

