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
import { deletePickupLocationAction, togglePickupLocationAction } from "../../_actions/pickup-location.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PickupLocationWithParsed {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  pickupDays: number[];
  pickupTimeWindows: string;
  instructions: string | null;
  isActive: number;
  requiresPreorder: number;
  leadTimeDays: number;
}

export function PickupLocationsTable({ locations }: { locations: PickupLocationWithParsed[] }) {
  const router = useRouter();
  const { execute: deleteLocation } = useServerAction(deletePickupLocationAction);
  const { execute: toggleLocation } = useServerAction(togglePickupLocationAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this pickup location?")) return;
    setDeletingId(id);
    const [, error] = await deleteLocation(id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Location deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    const [, error] = await toggleLocation({ id, isActive: !currentStatus });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Location ${!currentStatus ? 'enabled' : 'disabled'}`);
      router.refresh();
    }
  }

  function formatPickupDays(days: number[]) {
    return days.map(d => DAYS[d]).join(', ');
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Manage pickup locations (always FREE for customers)
        </p>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Pickup Days</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No pickup locations configured
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{location.address.street}</div>
                      <div className="text-muted-foreground">
                        {location.address.city}, {location.address.state} {location.address.zip}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatPickupDays(location.pickupDays)}</TableCell>
                  <TableCell>{location.pickupTimeWindows}</TableCell>
                  <TableCell>{location.leadTimeDays} days</TableCell>
                  <TableCell>
                    <Badge variant={location.isActive ? "default" : "secondary"}>
                      {location.isActive ? 'Active' : 'Inactive'}
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
                          onClick={() => handleToggle(location.id, !!location.isActive)}
                        >
                          {location.isActive ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(location.id)}
                          disabled={deletingId === location.id}
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
