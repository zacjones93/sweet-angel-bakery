import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
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
