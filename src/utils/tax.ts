import { SALES_TAX_RATE } from "@/constants";

/**
 * Calculate sales tax for Idaho (Boise/Caldwell area)
 * Tax rate: 6% (state) + 0% (local) = 6%
 *
 * @param subtotal - Subtotal amount in cents
 * @returns Tax amount in cents (rounded to nearest cent)
 */
export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * SALES_TAX_RATE);
}

/**
 * Calculate total amount including tax
 *
 * @param subtotal - Subtotal amount in cents
 * @returns Object with subtotal, tax, and total amounts in cents
 */
export function calculateOrderTotals(subtotal: number) {
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
  };
}

/**
 * Format cents to dollar string
 *
 * @param cents - Amount in cents
 * @returns Formatted dollar string (e.g., "$12.34")
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
