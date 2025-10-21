import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// This route serves images from R2 storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { env } = await getCloudflareContext();
    const { path } = await params;
    const key = path.join("/");

    // Get the image from R2
    const object = await env.PRODUCT_IMAGES.get(key);

    if (!object) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Return the image with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(object.body, {
      headers,
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

