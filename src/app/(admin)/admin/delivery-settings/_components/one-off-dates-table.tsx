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
import { deleteOneOffDateAction } from "../_actions/one-off-dates.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { DeliveryOneOffDate } from "@/db/schema";
import { format } from "date-fns";
import { OneOffDateDialog } from "./one-off-date-dialog";

/**
 * Parse a date string in YYYY-MM-DD format as a local date in the browser's timezone.
 *
 * IMPORTANT: Despite the function name, this creates a Date in the user's browser timezone,
 * NOT Mountain Time. This is acceptable for display-only purposes (showing dates to admin users).
 *
 * For server-side date calculations or data that must be in Mountain Time, use the
 * timezone utilities in @/utils/timezone (e.g., parseMountainISODate).
 *
 * @param isoDateString - Date in "YYYY-MM-DD" format (should come from database)
 * @returns Date object at midnight in browser's local timezone
 */
function parseMountainDate(isoDateString: string): Date {
  const [year, month, day] = isoDateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function OneOffDatesTable({ oneOffDates }: { oneOffDates: DeliveryOneOffDate[] }) {
  const router = useRouter();
  const { execute: deleteOneOffDate } = useServerAction(deleteOneOffDateAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this one-off date?")) return;
    setDeletingId(id);
    const [, error] = await deleteOneOffDate({ id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("One-off date deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Add custom delivery/pickup dates outside the regular schedule
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Date
        </Button>
      </div>

      {oneOffDates.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <p className="text-sm text-muted-foreground">No one-off dates configured</p>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            variant="outline"
            className="mt-4"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add First Date
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Date</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[140px]">Time Window</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oneOffDates.map((oneOff) => {
                // Parse date string (YYYY-MM-DD) as a local date to prevent timezone issues
                const oneOffDate = parseMountainDate(oneOff.date);

                // Determine time window display
                const timeWindow = oneOff.timeWindowStart && oneOff.timeWindowEnd
                  ? `${oneOff.timeWindowStart} - ${oneOff.timeWindowEnd}`
                  : 'Default';

                return (
                  <TableRow key={oneOff.id}>
                    <TableCell>
                      <div className="font-medium">{format(oneOffDate, "EEE, MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{format(oneOffDate, "EEEE")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={oneOff.type === 'delivery'
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {oneOff.type === 'delivery' ? 'Delivery' : 'Pickup'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{oneOff.reason || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeWindow}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(oneOff.id)}
                        disabled={deletingId === oneOff.id}
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

      <OneOffDateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
