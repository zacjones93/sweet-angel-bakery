import "server-only";

export type MerchantProviderType = "stripe" | "square";

export interface OrderItemCustomizations {
	selectedVariant?: {
		id: string;
		name: string;
		price: number;
	};
	customizations?: Record<string, unknown>;
}

export interface CheckoutLineItem {
	productId: string;
	name: string;
	description?: string;
	price: number; // cents
	quantity: number;
	imageUrl?: string;
	customizations?: OrderItemCustomizations;
}

export interface CheckoutOptions {
	lineItems: CheckoutLineItem[];
	customerEmail?: string;
	customerName?: string;
	customerPhone?: string;
	successUrl: string;
	cancelUrl: string;
	metadata?: Record<string, string>;
}

export interface CheckoutResult {
	sessionId: string;
	url: string;
	expiresAt?: Date;
}

export interface WebhookEvent {
	id: string;
	type: string;
	createdAt: Date;
	data: unknown;
}

export interface FeeInfo {
	orderAmount: number;
	totalFee: number;
	netAmount: number;
	percentageFee: number;
	fixedFee: number;
}

export interface WebhookResult {
	processed: boolean;
	orderId?: string;
	paymentStatus?: "pending" | "paid" | "failed" | "refunded";
	feeInfo?: FeeInfo;
	error?: string;
}

export interface ProductCreateOptions {
	name: string;
	description?: string;
	price: number; // cents (default price)
	imageUrl?: string;
	variants?: Array<{
		id: string;
		name: string;
		price: number; // cents
	}>;
	metadata?: Record<string, string>;
}

export interface ProductCreateResult {
	productId: string;
	priceId?: string; // Default price ID (Stripe) or variation ID (Square)
	variantIds?: Record<string, string>; // Map of variant IDs
}

export interface RefundOptions {
	paymentId: string;
	amount?: number; // cents, full refund if omitted
	reason?: string;
}

export interface RefundResult {
	refundId: string;
	status: "succeeded" | "pending" | "failed";
	amount: number; // cents
}

export interface PaymentDetails {
	id: string;
	status: "pending" | "paid" | "failed" | "refunded";
	amount: number;
	currency: string;
	createdAt: Date;
}

export interface IMerchantProvider {
	readonly name: MerchantProviderType;

	/**
	 * Initialize the provider with credentials
	 */
	initialize(): Promise<void>;

	/**
	 * Create a checkout session/link
	 */
	createCheckout(options: CheckoutOptions): Promise<CheckoutResult>;

	/**
	 * Verify and process webhook events
	 */
	verifyWebhook(body: string, signature: string): Promise<WebhookEvent>;

	/**
	 * Handle webhook event and create order
	 */
	handleWebhook(event: WebhookEvent): Promise<WebhookResult>;

	/**
	 * Create product in provider's catalog
	 */
	createProduct(options: ProductCreateOptions): Promise<ProductCreateResult>;

	/**
	 * Refund a payment
	 */
	refundPayment(options: RefundOptions): Promise<RefundResult>;

	/**
	 * Get payment details
	 */
	getPayment(paymentId: string): Promise<PaymentDetails>;
}
