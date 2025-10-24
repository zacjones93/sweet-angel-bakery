"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash, PlusCircle } from "lucide-react";
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
import { deleteDeliveryScheduleAction, toggleDeliveryScheduleAction } from "../../_actions/delivery-schedule.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { DeliverySchedule } from "@/db/schema";
import { DeliveryScheduleDialog } from "./delivery-schedule-dialog";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DeliverySchedulesTable({ schedules }: { schedules: DeliverySchedule[] }) {
  const router = useRouter();
  const { execute: deleteSchedule } = useServerAction(deleteDeliveryScheduleAction);
  const { execute: toggleSchedule } = useServerAction(toggleDeliveryScheduleAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeliverySchedule | undefined>();

  async function handleDelete(id: string) {
    if (!confirm("Delete this delivery schedule?")) return;
    setDeletingId(id);
    const [, error] = await deleteSchedule(id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Schedule deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    const [, error] = await toggleSchedule({ id, isActive: !currentStatus });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Schedule ${!currentStatus ? 'enabled' : 'disabled'}`);
      router.refresh();
    }
  }

  function handleAdd() {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  }

  function handleEdit(schedule: DeliverySchedule) {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Configure weekly delivery days and cutoff times
        </p>
        <Button size="sm" onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Delivery Day</TableHead>
              <TableHead>Cutoff</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Time Window</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No delivery schedules configured
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.name}</TableCell>
                  <TableCell>{DAYS[schedule.dayOfWeek]}</TableCell>
                  <TableCell>
                    {DAYS[schedule.cutoffDay]} {schedule.cutoffTime}
                  </TableCell>
                  <TableCell>{schedule.leadTimeDays} days</TableCell>
                  <TableCell>{schedule.deliveryTimeWindow || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
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
                          onClick={() => handleEdit(schedule)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggle(schedule.id, !!schedule.isActive)}
                        >
                          {schedule.isActive ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deletingId === schedule.id}
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

      <DeliveryScheduleDialog
        schedule={editingSchedule}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
