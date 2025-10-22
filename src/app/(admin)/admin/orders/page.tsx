import { PageHeader } from "@/components/page-header";
import { OrdersTable } from "./_components/orders-table";
import { getOrdersAction } from "../_actions/orders.action";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { orderStatusTuple } from "@/db/schema";

export const metadata: Metadata = {
  title: "Order Management",
  description: "Manage all bakery orders",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = params.page ? parseInt(params.page) : 1;
  const search = params.search;
  const status = params.status as typeof orderStatusTuple[number] | undefined;

  const [result, err] = await getOrdersAction({
    page,
    limit: 20,
    search,
    status,
  });

  if (err) {
    throw new Error(err.message);
  }

  const { orders, totalCount, currentPage, totalPages } = result;

  return (
    <NuqsAdapter>
      <PageHeader
        items={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/orders", label: "Orders" },
        ]}
      />
      <div className="container mx-auto py-6">
        <OrdersTable
          orders={orders}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </NuqsAdapter>
  );
}
