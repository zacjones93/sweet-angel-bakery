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
 * Parse a date string in YYYY-MM-DD format as a local date in Mountain Time
 * We append T00:00:00 to ensure it's parsed as a local date, not UTC
 */
function parseMountainDate(isoDateString: string): Date {
  // Parse "2025-01-15" as a local date by adding time component
  // This prevents timezone shifts
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">One-Off Delivery/Pickup Dates</h2>
          <p className="text-sm text-muted-foreground">
            Add custom dates outside the regular delivery/pickup schedule. All dates are in Mountain Time (America/Boise).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add One-Off Date
        </Button>
      </div>

      {oneOffDates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No one-off dates configured</p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First One-Off Date
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time Window</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="font-medium">
                      {format(oneOffDate, "EEEE, MMMM d, yyyy")}
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
                    <TableCell>{oneOff.reason || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeWindow}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
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
