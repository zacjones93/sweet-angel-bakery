"use server";
import { createServerAction } from "zsa";
import { requireAdmin } from "@/utils/auth";
import { uploadProductImage } from "@/utils/upload-image";

export const uploadProductImageAction = createServerAction()
  .handler(async ({ request }) => {
    await requireAdmin();

    const formData = await request?.formData();
    const file = formData?.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    const { url, key } = await uploadProductImage({ file });

    return { url, key };
  });

