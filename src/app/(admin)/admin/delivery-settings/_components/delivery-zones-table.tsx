"use client";

import { useState } from "react";
import { MoreHorizontal, Trash, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useServerAction } from "zsa-react";
import { deleteDeliveryZoneAction, toggleDeliveryZoneAction } from "../../_actions/delivery-zone.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeliveryZoneWithParsed {
  id: string;
  name: string;
  zipCodes: string[];
  feeAmount: number;
  isActive: number;
  priority: number;
}

export function DeliveryZonesTable({ zones }: { zones: DeliveryZoneWithParsed[] }) {
  const router = useRouter();
  const { execute: deleteZone } = useServerAction(deleteDeliveryZoneAction);
  const { execute: toggleZone } = useServerAction(toggleDeliveryZoneAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this delivery zone?")) return;
    setDeletingId(id);
    const [, error] = await deleteZone(id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Zone deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    const [, error] = await toggleZone({ id, isActive: !currentStatus });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Zone ${!currentStatus ? 'enabled' : 'disabled'}`);
      router.refresh();
    }
  }

  function formatFee(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatZipCodes(zips: string[]) {
    if (zips.length <= 3) {
      return zips.join(', ');
    }
    return `${zips.slice(0, 3).join(', ')} +${zips.length - 3} more`;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Configure delivery zones with ZIP codes and fees (Pickup is always FREE)
        </p>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Zone
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ZIP Codes</TableHead>
              <TableHead>Delivery Fee</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No delivery zones configured
                </TableCell>
              </TableRow>
            ) : (
              zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatZipCodes(zone.zipCodes)}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatFee(zone.feeAmount)}
                  </TableCell>
                  <TableCell>{zone.priority}</TableCell>
                  <TableCell>
                    <Badge variant={zone.isActive ? "default" : "secondary"}>
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleToggle(zone.id, !!zone.isActive)}
                        >
                          {zone.isActive ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(zone.id)}
                          disabled={deletingId === zone.id}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
