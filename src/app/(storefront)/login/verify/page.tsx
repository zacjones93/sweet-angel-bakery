"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { verifyMagicLinkAction } from "../_actions/verify-magic-link.action";
import { useServerAction } from "zsa-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyMagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const { execute, error } = useServerAction(verifyMagicLinkAction);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    async function verify() {
      const [data, err] = await execute({ token: token! });

      if (err) {
        setStatus("error");
        return;
      }

      setStatus("success");

      // Redirect to profile after 2 seconds
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    }

    verify();
  }, [token, execute, router]);

  if (!token || status === "error") {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Login Link Invalid</CardTitle>
              <CardDescription>
                {error?.message || "This login link is invalid or has expired."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Login links expire after 15 minutes for your security.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Request a New Link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <CardTitle>Logging You In</CardTitle>
              <CardDescription>Please wait a moment...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Login Successful!</CardTitle>
            <CardDescription>
              Redirecting you to your profile...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
