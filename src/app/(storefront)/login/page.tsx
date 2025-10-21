"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, CheckCircle } from "lucide-react";
import { requestMagicLinkAction } from "./_actions/request-magic-link.action";
import { useServerAction } from "zsa-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback");

  const { execute, isPending, error } = useServerAction(requestMagicLinkAction);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const [data, err] = await execute({
      email,
      callback: callback || undefined,
    });

    if (err) {
      console.error("Magic link error:", err);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                We've sent a login link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to securely log in to your loyalty
                account. The link will expire in 15 minutes.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-primary underline underline-offset-4 hover:no-underline"
                >
                  try again
                </button>
              </p>
            </CardContent>
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
            <CardTitle className="text-2xl font-display">
              Loyalty Member Login
            </CardTitle>
            <CardDescription>
              Enter your email to receive a secure login link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the email you provided when placing an order
                </p>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isPending}
              >
                {isPending ? "Sending..." : "Send Login Link"}
              </Button>

              <div className="pt-4 text-center text-sm text-muted-foreground">
                <p>
                  New here?{" "}
                  <Link
                    href="/signup"
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Join our loyalty program
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 rounded-lg border bg-muted/50 p-6">
          <h3 className="font-semibold mb-2">Loyalty Member Benefits</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>View your complete order history</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Get early access to product drops (24h before public)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Receive notifications about new treats</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Optional SMS updates on orders and drops</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
