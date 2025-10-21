"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Clock } from "lucide-react";

interface OrderStatsProps {
  statusCounts: Array<{ status: string; count: number }>;
  totalRevenue: number;
  todayOrders: number;
}

export function OrderStats({
  statusCounts,
  totalRevenue,
  todayOrders,
}: OrderStatsProps) {
  const totalOrders = statusCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <p className="text-xs text-muted-foreground">
            {todayOrders} orders today
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(totalRevenue / 100).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">From completed orders</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statusCounts
              .filter(
                (s) =>
                  !["completed", "cancelled", "payment_failed"].includes(
                    s.status
                  )
              )
              .reduce((sum, item) => sum + item.count, 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Orders being processed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
