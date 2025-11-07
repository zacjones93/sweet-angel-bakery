"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable, merchantFeeTable, PAYMENT_STATUS } from "@/db/schema";
import { and, gte, lte, sql, eq } from "drizzle-orm";

const getRevenueStatsInputSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const getRevenueStatsAction = createServerAction()
  .input(getRevenueStatsInputSchema)
  .handler(async ({ input }) => {
    const db = getDB();

    // Convert dates to Unix timestamps (seconds)
    const startTimestamp = Math.floor(input.startDate.getTime() / 1000);
    const endTimestamp = Math.floor(input.endDate.getTime() / 1000);

    // Get revenue stats with fees
    const statsQuery = await db
      .select({
        totalOrders: sql<number>`COUNT(DISTINCT ${orderTable.id})`,
        grossRevenue: sql<number>`COALESCE(SUM(${orderTable.totalAmount}), 0)`,
        totalFees: sql<number>`COALESCE(SUM(${merchantFeeTable.totalFee}), 0)`,
        stripeFees: sql<number>`COALESCE(SUM(CASE WHEN ${merchantFeeTable.merchantProvider} = 'stripe' THEN ${merchantFeeTable.totalFee} ELSE 0 END), 0)`,
        squareFees: sql<number>`COALESCE(SUM(CASE WHEN ${merchantFeeTable.merchantProvider} = 'square' THEN ${merchantFeeTable.totalFee} ELSE 0 END), 0)`,
        netRevenue: sql<number>`COALESCE(SUM(${merchantFeeTable.netAmount}), 0)`,
        avgOrderValue: sql<number>`COALESCE(AVG(${orderTable.totalAmount}), 0)`,
        avgFee: sql<number>`COALESCE(AVG(${merchantFeeTable.totalFee}), 0)`,
        totalDeliveryFees: sql<number>`COALESCE(SUM(${orderTable.deliveryFee}), 0)`,
        totalTax: sql<number>`COALESCE(SUM(${orderTable.tax}), 0)`,
      })
      .from(orderTable)
      .leftJoin(merchantFeeTable, eq(merchantFeeTable.orderId, orderTable.id))
      .where(
        and(
          eq(orderTable.paymentStatus, PAYMENT_STATUS.PAID),
          gte(orderTable.createdAt, new Date(startTimestamp * 1000)),
          lte(orderTable.createdAt, new Date(endTimestamp * 1000))
        )
      );

    const stats = statsQuery[0];

    // Get provider breakdown
    const providerBreakdown = await db
      .select({
        provider: merchantFeeTable.merchantProvider,
        orderCount: sql<number>`COUNT(DISTINCT ${orderTable.id})`,
        grossRevenue: sql<number>`COALESCE(SUM(${orderTable.totalAmount}), 0)`,
        totalFees: sql<number>`COALESCE(SUM(${merchantFeeTable.totalFee}), 0)`,
        netRevenue: sql<number>`COALESCE(SUM(${merchantFeeTable.netAmount}), 0)`,
        avgFee: sql<number>`COALESCE(AVG(${merchantFeeTable.totalFee}), 0)`,
      })
      .from(orderTable)
      .leftJoin(merchantFeeTable, eq(merchantFeeTable.orderId, orderTable.id))
      .where(
        and(
          eq(orderTable.paymentStatus, PAYMENT_STATUS.PAID),
          gte(orderTable.createdAt, new Date(startTimestamp * 1000)),
          lte(orderTable.createdAt, new Date(endTimestamp * 1000))
        )
      )
      .groupBy(merchantFeeTable.merchantProvider);

    return {
      overview: {
        totalOrders: Number(stats.totalOrders) || 0,
        grossRevenue: Number(stats.grossRevenue) || 0,
        totalFees: Number(stats.totalFees) || 0,
        netRevenue: Number(stats.netRevenue) || 0,
        avgOrderValue: Number(stats.avgOrderValue) || 0,
        avgFee: Number(stats.avgFee) || 0,
        stripeFees: Number(stats.stripeFees) || 0,
        squareFees: Number(stats.squareFees) || 0,
        totalDeliveryFees: Number(stats.totalDeliveryFees) || 0,
        totalTax: Number(stats.totalTax) || 0,
      },
      byProvider: providerBreakdown.map((row) => ({
        provider: row.provider || "unknown",
        orderCount: Number(row.orderCount) || 0,
        grossRevenue: Number(row.grossRevenue) || 0,
        totalFees: Number(row.totalFees) || 0,
        netRevenue: Number(row.netRevenue) || 0,
        avgFee: Number(row.avgFee) || 0,
        feePercentage: row.grossRevenue
          ? ((Number(row.totalFees) / Number(row.grossRevenue)) * 100)
          : 0,
      })),
    };
  });
