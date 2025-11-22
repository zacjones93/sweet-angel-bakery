"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "./order-status-badge";
import { UpdateOrderStatusDialog } from "./update-order-status-dialog";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/db/schema";
import { Search, Eye, ChevronLeft, ChevronRight, Truck, Store, Calendar } from "lucide-react";
import { formatDate } from "@/utils/format-date";

// Simplified order statuses for admin interface
const ALLOWED_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
] as const;

interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
  fulfillmentMethod: string | null;
  fulfillmentType: string | null;
  deliveryDate: string | null;
}

interface OrdersTableProps {
  orders: Order[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function OrdersTable({
  orders,
  totalCount,
  currentPage,
  totalPages,
}: OrdersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", "1");
    router.push(`/admin/orders?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by email, name, or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALLOWED_ORDER_STATUSES.map((key) => (
                <SelectItem
                  key={key}
                  value={ORDER_STATUS[key as keyof typeof ORDER_STATUS]}
                >
                  {ORDER_STATUS_LABELS[key as keyof typeof ORDER_STATUS_LABELS]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-muted-foreground"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  // Find payment status key for styling
                  const paymentStatusKey = Object.keys(
                    PAYMENT_STATUS
                  ).find(
                    (key) =>
                      PAYMENT_STATUS[
                        key as keyof typeof PAYMENT_STATUS
                      ] === order.paymentStatus
                  ) as keyof typeof PAYMENT_STATUS_LABELS | undefined;

                  const fulfillmentMethod = (order.fulfillmentMethod || order.fulfillmentType) as "delivery" | "pickup" | null;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.substring(0, 12)}...
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {fulfillmentMethod === "delivery" ? (
                            <>
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span>Delivery</span>
                            </>
                          ) : fulfillmentMethod === "pickup" ? (
                            <>
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span>Pickup</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.deliveryDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(new Date(order.deliveryDate))}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{order.itemsCount}</TableCell>
                      <TableCell>
                        ${(order.totalAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            paymentStatusKey
                              ? PAYMENT_STATUS_COLORS[paymentStatusKey]
                              : ""
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[paymentStatusKey || "PENDING"]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <UpdateOrderStatusDialog
                            orderId={order.id}
                            currentStatus={order.status}
                            fulfillmentMethod={fulfillmentMethod}
                            trigger={
                              <Button variant="outline" size="sm">
                                Update Status
                              </Button>
                            }
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const paymentStatusKey = Object.keys(
                PAYMENT_STATUS
              ).find(
                (key) =>
                  PAYMENT_STATUS[
                    key as keyof typeof PAYMENT_STATUS
                  ] === order.paymentStatus
              ) as keyof typeof PAYMENT_STATUS_LABELS | undefined;

              const fulfillmentMethod = (order.fulfillmentMethod || order.fulfillmentType) as "delivery" | "pickup" | null;

              return (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Header with Order ID and Status */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Order ID</p>
                          <p className="font-mono text-sm">{order.id.substring(0, 12)}...</p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>

                      {/* Customer Info */}
                      <div>
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                      </div>

                      {/* Order Details Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {fulfillmentMethod === "delivery" ? (
                              <>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Delivery</span>
                              </>
                            ) : fulfillmentMethod === "pickup" ? (
                              <>
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Pickup</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Delivery Date</p>
                          {order.deliveryDate ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(new Date(order.deliveryDate))}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p className="text-sm mt-1">{order.itemsCount}</p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-medium mt-1">
                            ${(order.totalAmount / 100).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Payment</p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              paymentStatusKey
                                ? PAYMENT_STATUS_COLORS[paymentStatusKey]
                                : ""
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[paymentStatusKey || "PENDING"]}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm mt-1">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <UpdateOrderStatusDialog
                          orderId={order.id}
                          currentStatus={order.status}
                          fulfillmentMethod={fulfillmentMethod}
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1">
                              Update Status
                            </Button>
                          }
                        />
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
