"use client";

import { useState } from "react";
import { useServerAction } from "zsa-react";
import { exportDeliveryRoutesAction } from "../../_actions/export-orders.action";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportDeliveryButtonProps {
  deliveryDate: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function ExportDeliveryButton({ deliveryDate, variant = "outline", size = "sm" }: ExportDeliveryButtonProps) {
  const { execute, isPending } = useServerAction(exportDeliveryRoutesAction);

  const handleExport = async () => {
    try {
      const [result, err] = await execute({ deliveryDate });

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

      toast.success(`Exported ${result.orderCount} delivery orders`);
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
          <FileDown className="mr-2 h-4 w-4" />
          Export Route
        </>
      )}
    </Button>
  );
}
