import "server-only";
import type { MerchantProviderType } from "./types";

export interface FeeConfig {
	percentageFee: number; // Basis points (e.g., 290 = 2.9%)
	fixedFee: number; // Cents (e.g., 30 = $0.30)
}

export const PROVIDER_FEE_CONFIG: Record<MerchantProviderType, FeeConfig> = {
	stripe: {
		percentageFee: 290, // 2.9%
		fixedFee: 30, // $0.30
	},
	square: {
		percentageFee: 290, // 2.9%
		fixedFee: 30, // $0.30
	},
};

export interface FeeCalculationResult {
	orderAmount: number; // cents
	percentageFee: number; // basis points
	fixedFee: number; // cents
	totalFee: number; // cents
	netAmount: number; // cents
}

/**
 * Calculate merchant processing fees
 * Formula: fee = (orderAmount * percentageFee / 10000) + fixedFee
 *
 * Example:
 * Order total: $25.00 = 2500 cents
 * Percentage fee: 2.9% = 290 basis points
 * Fixed fee: $0.30 = 30 cents
 *
 * Calculation:
 * - Percentage amount: 2500 * 290 / 10000 = 72.5 → 73 cents
 * - Total fee: 73 + 30 = 103 cents ($1.03)
 * - Net amount: 2500 - 103 = 2397 cents ($23.97)
 */
export function calculateMerchantFee({
	orderAmount,
	merchantProvider,
}: {
	orderAmount: number;
	merchantProvider: MerchantProviderType;
}): FeeCalculationResult {
	const config = PROVIDER_FEE_CONFIG[merchantProvider];

	// Calculate percentage fee (basis points to decimal)
	const percentageFeeAmount = Math.round(
		(orderAmount * config.percentageFee) / 10000
	);

	// Total fee
	const totalFee = percentageFeeAmount + config.fixedFee;

	// Net amount
	const netAmount = orderAmount - totalFee;

	return {
		orderAmount,
		percentageFee: config.percentageFee,
		fixedFee: config.fixedFee,
		totalFee,
		netAmount,
	};
}
