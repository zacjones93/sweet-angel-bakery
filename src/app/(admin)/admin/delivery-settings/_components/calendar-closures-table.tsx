"use client";

import { useState } from "react";
import { PlusCircle, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useServerAction } from "zsa-react";
import { deleteCalendarClosureAction } from "../_actions/calendar-closures.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { DeliveryCalendarClosure } from "@/db/schema";
import { format } from "date-fns";
import { CalendarClosureDialog } from "./calendar-closure-dialog";

/**
 * Parse a date string in YYYY-MM-DD format as a local date in Mountain Time
 * We append T00:00:00 to ensure it's parsed as a local date, not UTC
 */
function parseMountainDate(isoDateString: string): Date {
  // Parse "2025-01-15" as a local date by adding time component
  // This prevents timezone shifts
  const [year, month, day] = isoDateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function CalendarClosuresTable({ closures }: { closures: DeliveryCalendarClosure[] }) {
  const router = useRouter();
  const { execute: deleteClosure } = useServerAction(deleteCalendarClosureAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this calendar closure?")) return;
    setDeletingId(id);
    const [, error] = await deleteClosure({ id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Closure deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Closures</h2>
          <p className="text-sm text-muted-foreground">
            Block specific dates from delivery or pickup schedules. All dates are in Mountain Time (America/Boise).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Closure
        </Button>
      </div>

      {closures.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No calendar closures configured</p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First Closure
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Affects</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closures.map((closure) => {
                // Parse date string (YYYY-MM-DD) as a local date to prevent timezone issues
                const closureDate = parseMountainDate(closure.closureDate);

                return (
                  <TableRow key={closure.id}>
                    <TableCell className="font-medium">
                      {format(closureDate, "EEEE, MMMM d, yyyy")}
                    </TableCell>
                  <TableCell>{closure.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {closure.affectsDelivery === 1 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Delivery
                        </Badge>
                      )}
                      {closure.affectsPickup === 1 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Pickup
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(closure.id)}
                      disabled={deletingId === closure.id}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CalendarClosureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
