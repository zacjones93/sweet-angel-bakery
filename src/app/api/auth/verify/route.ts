import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkAndCreateSession } from "@/utils/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SITE_URL } from "@/constants";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    // Redirect to error page
    return NextResponse.redirect(new URL("/login?error=no_token", SITE_URL));
  }

  const { env } = await getCloudflareContext();

  if (!env.NEXT_INC_CACHE_KV) {
    return NextResponse.redirect(
      new URL("/login?error=kv_unavailable", SITE_URL)
    );
  }

  try {
    // Verify the magic link token and create session
    const result = await verifyMagicLinkAndCreateSession({
      token,
      kv: env.NEXT_INC_CACHE_KV,
    });

    if (!result) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", SITE_URL));
    }

    // Redirect to callback URL or profile
    const redirectUrl = result.callback || "/profile";
    return NextResponse.redirect(new URL(redirectUrl, SITE_URL));
  } catch (error) {
    console.error("Magic link verification error:", error);
    return NextResponse.redirect(new URL("/login?error=verification_failed", SITE_URL));
  }
}
