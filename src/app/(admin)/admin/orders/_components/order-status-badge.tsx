"use client";

import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  // Find the key that matches the status value
  const statusKey = Object.entries(ORDER_STATUS).find(
    ([, value]) => value === status
  )?.[0] as keyof typeof ORDER_STATUS | undefined;

  if (!statusKey) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        Unknown
      </Badge>
    );
  }

  const label = ORDER_STATUS_LABELS[statusKey];
  const colorClass = ORDER_STATUS_COLORS[statusKey];

  return (
    <Badge variant="outline" className={`${colorClass} font-medium`}>
      {label}
    </Badge>
  );
}
