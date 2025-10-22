import "server-only";
import type { IMerchantProvider, MerchantProviderType } from "./types";

let providerInstance: IMerchantProvider | null = null;

export async function getMerchantProvider(): Promise<IMerchantProvider> {
	if (providerInstance) return providerInstance;

	const providerType = (process.env.MERCHANT_PROVIDER ||
		"stripe") as MerchantProviderType;

	switch (providerType) {
		case "stripe": {
			const { StripeProvider } = await import("./providers/stripe");
			providerInstance = new StripeProvider();
			break;
		}
		case "square": {
			const { SquareProvider } = await import("./providers/square");
			providerInstance = new SquareProvider();
			break;
		}
		default:
			throw new Error(`Unknown merchant provider: ${providerType}`);
	}

	await providerInstance.initialize();
	return providerInstance;
}

// Helper to get current provider type without initializing
export function getCurrentProviderType(): MerchantProviderType {
	return (process.env.MERCHANT_PROVIDER || "stripe") as MerchantProviderType;
}

// Reset provider instance (useful for testing)
export function resetProviderInstance(): void {
	providerInstance = null;
}
