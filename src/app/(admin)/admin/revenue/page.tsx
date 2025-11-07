import { getRevenueStatsAction } from "./_actions/revenue-stats.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangeFilter } from "./_components/date-range-filter";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear
} from "date-fns";
import { NuqsAdapter } from "nuqs/adapters/next/app";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type SearchParams = Promise<{
  period?: string;
  startDate?: string;
  endDate?: string;
}>;

export default async function RevenuePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { period = "month", startDate: startDateParam, endDate: endDateParam } = params;

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  // Calculate date range based on period
  if (period === "custom" && startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
  } else if (period === "week") {
    startDate = startOfWeek(now, { weekStartsOn: 0 });
    endDate = endOfWeek(now, { weekStartsOn: 0 });
  } else if (period === "year") {
    startDate = startOfYear(now);
    endDate = endOfYear(now);
  } else {
    // Default to month
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
  }

  const [stats, error] = await getRevenueStatsAction({ startDate, endDate });

  if (error) {
    return (
      <NuqsAdapter>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Revenue Statistics</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your sales, fees, and net revenue
              </p>
            </div>
          </div>
          <p className="text-red-600">Error loading stats: {error.message}</p>
        </div>
      </NuqsAdapter>
    );
  }

  if (!stats) {
    return (
      <NuqsAdapter>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Revenue Statistics</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your sales, fees, and net revenue
              </p>
            </div>
          </div>
          <p>No data available</p>
        </div>
      </NuqsAdapter>
    );
  }

  return (
    <NuqsAdapter>
      <div className="p-6 space-y-6">
      {/* Header with date filter */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenue Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })} - {endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.overview.grossRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total charged to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              -{formatCurrency(stats.overview.totalFees)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.overview.squareFees > 0 && `Square: ${formatCurrency(stats.overview.squareFees)}`}
              {stats.overview.stripeFees > 0 && stats.overview.squareFees > 0 && " | "}
              {stats.overview.stripeFees > 0 && `Stripe: ${formatCurrency(stats.overview.stripeFees)}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.overview.netRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              After processing fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.overview.totalOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(stats.overview.avgOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.overview.totalDeliveryFees)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From delivery orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tax Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.overview.totalTax)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sales tax collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Percentage Overview */}
      {stats.overview.grossRevenue > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fee Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Effective Fee Rate:</span>{" "}
                <span className="font-semibold">
                  {((stats.overview.totalFees / stats.overview.grossRevenue) * 100).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Fee per Order:</span>{" "}
                <span className="font-semibold">
                  {formatCurrency(stats.overview.avgFee)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Breakdown */}
      {stats.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Gross Revenue</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Fee %</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byProvider.map((provider) => (
                  <TableRow key={provider.provider}>
                    <TableCell className="font-medium capitalize">
                      {provider.provider}
                    </TableCell>
                    <TableCell className="text-right">
                      {provider.orderCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(provider.grossRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(provider.totalFees)}
                    </TableCell>
                    <TableCell className="text-right">
                      {provider.feePercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(provider.netRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No data message */}
      {stats.overview.totalOrders === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No orders found for the selected period
          </CardContent>
        </Card>
      )}
      </div>
    </NuqsAdapter>
  );
}
