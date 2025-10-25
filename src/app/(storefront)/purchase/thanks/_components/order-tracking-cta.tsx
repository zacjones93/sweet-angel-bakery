"use client";

import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, LogIn, UserPlus } from "lucide-react";

type Props = {
	orderId: string;
	customerEmail: string;
	emailExistsInDatabase: boolean;
};

export function OrderTrackingCTA({
	orderId,
	customerEmail,
	emailExistsInDatabase,
}: Props) {
	// Extract short order number for display
	const orderNumber = orderId.substring(4, 12).toUpperCase();

	// Create callback URL for after login/signup
	const callbackUrl = `/profile/orders/${orderId}`;

	if (emailExistsInDatabase) {
		// User has an account - show login CTA
		return (
			<Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
				<CardHeader>
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-500/20">
							<LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-lg">Track Your Order</CardTitle>
							<CardDescription className="mt-1">
								Log in to see real-time updates for order #{orderNumber}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg bg-white/70 dark:bg-black/20 p-3 text-sm">
						<p className="font-medium mb-2">With your loyalty account:</p>
						<ul className="space-y-1.5 text-muted-foreground">
							<li className="flex items-start">
								<Package className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
								<span>Track order status from baking to pickup</span>
							</li>
							<li className="flex items-start">
								<Package className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
								<span>View complete order history</span>
							</li>
							<li className="flex items-start">
								<Package className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
								<span>Get early access to new product drops</span>
							</li>
						</ul>
					</div>

					<Button asChild className="w-full" size="lg">
						<Link
							href={`/login?email=${encodeURIComponent(customerEmail)}&callback=${encodeURIComponent(callbackUrl)}`}
						>
							Log In to Track Order
						</Link>
					</Button>

					<p className="text-xs text-center text-muted-foreground">
						We&apos;ll email you a secure login link
					</p>
				</CardContent>
			</Card>
		);
	}

	// User doesn't have an account - show signup CTA
	return (
		<Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
			<CardHeader>
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
						<UserPlus className="h-5 w-5 text-primary" />
					</div>
					<div className="flex-1">
						<CardTitle className="text-lg">
							Create an Account to Track This Order
						</CardTitle>
						<CardDescription className="mt-1">
							Join our loyalty program to track order #{orderNumber} and get
							exclusive benefits
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="rounded-lg bg-white/70 dark:bg-black/20 p-3 text-sm">
					<p className="font-medium mb-2">Member Benefits:</p>
					<ul className="space-y-1.5 text-muted-foreground">
						<li className="flex items-start">
							<span className="mr-2">✓</span>
							<span>Track all your orders in real-time</span>
						</li>
						<li className="flex items-start">
							<span className="mr-2">✓</span>
							<span>Early access to product drops (24h before public)</span>
						</li>
						<li className="flex items-start">
							<span className="mr-2">✓</span>
							<span>Notifications about new treats</span>
						</li>
						<li className="flex items-start">
							<span className="mr-2">✓</span>
							<span>Save delivery addresses and preferences</span>
						</li>
					</ul>
				</div>

				<Button asChild className="w-full" size="lg">
					<Link
						href={`/signup?email=${encodeURIComponent(customerEmail)}&orderId=${orderId}`}
					>
						Create Account &amp; Track Order
					</Link>
				</Button>

				<p className="text-xs text-center text-muted-foreground">
					Free to join • No password required • Secure magic link login
				</p>
			</CardContent>
		</Card>
	);
}
