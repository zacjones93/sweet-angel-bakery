"use client";

import { useServerAction } from "zsa-react";
import { exportPickupListAction } from "../../_actions/export-orders.action";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportPickupButtonProps {
  pickupDate: string;
  pickupLocationId: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function ExportPickupButton({
  pickupDate,
  pickupLocationId,
  variant = "outline",
  size = "sm",
}: ExportPickupButtonProps) {
  const { execute, isPending } = useServerAction(exportPickupListAction);

  const handleExport = async () => {
    try {
      const [result, err] = await execute({ pickupDate, pickupLocationId });

      if (err) {
        throw new Error(err.message);
      }

      // Create blob and trigger download
      const blob = new Blob([result.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${result.orderCount} pickup orders from ${result.locationName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export");
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Printer className="mr-2 h-4 w-4" />
          Print List
        </>
      )}
    </Button>
  );
}
