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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function RevenuePage() {
  // Default to current month
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [stats, error] = await getRevenueStatsAction({ startDate, endDate });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Revenue Statistics</h1>
        <p className="text-red-600">Error loading stats: {error.message}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Revenue Statistics</h1>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Revenue Statistics</h1>
      <p className="text-sm text-muted-foreground">
        Showing data for {startDate.toLocaleDateString()} -{" "}
        {endDate.toLocaleDateString()}
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Stripe: {formatCurrency(stats.overview.stripeFees)}
              {stats.overview.squareFees > 0 &&
                ` | Square: ${formatCurrency(stats.overview.squareFees)}`}
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
      </div>

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
    </div>
  );
}
