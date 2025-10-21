import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/auth";
import { uploadProductImage } from "@/utils/upload-image";

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Get the base URL from the request
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
    const baseUrl = host ? `${protocol}://${host}` : undefined;

    const { url, key } = await uploadProductImage({ file, baseUrl });

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

