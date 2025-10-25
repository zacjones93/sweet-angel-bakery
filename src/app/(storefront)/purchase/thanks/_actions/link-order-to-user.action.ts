"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookie } from "@/utils/auth";

const linkOrderInputSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
});

/**
 * Link an order to the currently logged-in user
 * This is used when a user logs in or signs up after placing an order
 */
export const linkOrderToUserAction = createServerAction()
	.input(linkOrderInputSchema)
	.handler(async ({ input }) => {
		const session = await getSessionFromCookie();

		if (!session) {
			throw new Error("You must be logged in to link an order");
		}

		const db = getDB();

		// Find the order
		const [order] = await db
			.select()
			.from(orderTable)
			.where(eq(orderTable.id, input.orderId))
			.limit(1);

		if (!order) {
			throw new Error("Order not found");
		}

		// Verify the order belongs to this user's email OR has no user yet
		if (
			order.customerEmail.toLowerCase() !== session.user.email?.toLowerCase()
		) {
			throw new Error(
				"This order doesn't belong to the email associated with your account"
			);
		}

		// If order already has a userId, check if it matches
		if (order.userId) {
			if (order.userId !== session.user.id) {
				throw new Error("This order is already linked to another account");
			}
			// Order already linked to this user
			return { success: true, alreadyLinked: true };
		}

		// Link the order to the user
		await db
			.update(orderTable)
			.set({ userId: session.user.id })
			.where(eq(orderTable.id, input.orderId));

		return { success: true, alreadyLinked: false };
	});
