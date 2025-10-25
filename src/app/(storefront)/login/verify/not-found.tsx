import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function NotFound() {
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
              This login link is invalid or has expired.
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
