"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getIsoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

export function FulfillmentFilters() {
  const defaultStart = useMemo(() => getIsoDate(new Date()), []);
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getIsoDate(d);
  }, []);

  const [startDate, setStartDate] = useQueryState("startDate", {
    defaultValue: defaultStart,
  });
  const [endDate, setEndDate] = useQueryState("endDate", {
    defaultValue: defaultEnd,
  });
  const [method, setMethod] = useQueryState("method", { defaultValue: "all" });

  function handleReset() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setMethod("all");
  }

  return (
    <div className="bg-muted/50 p-3 sm:p-4 rounded-lg border">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-xs text-muted-foreground">Start</label>
          <Input
            type="date"
            value={startDate || defaultStart}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-xs text-muted-foreground">End</label>
          <Input
            type="date"
            value={endDate || defaultEnd}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-xs text-muted-foreground">Method</label>
          <Select value={method || "all"} onValueChange={(v) => setMethod(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          className="h-9 text-sm shrink-0"
          size="sm"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}



