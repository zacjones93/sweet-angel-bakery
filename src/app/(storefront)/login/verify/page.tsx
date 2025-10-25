import { redirect } from "next/navigation";
import { SITE_URL } from "@/constants";

type Props = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyMagicLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect(`${SITE_URL}/login?error=no_token`);
  }

  // Redirect to API route that handles verification and sets cookie
  redirect(`${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`);
}
