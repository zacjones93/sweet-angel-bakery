"use server"

import { createServerAction } from "zsa"
import { z } from "zod"
import { getDB } from "@/db"
import { eq } from "drizzle-orm"
import { userTable } from "@/db/schema"
import { getSessionFromCookie } from "@/utils/auth"
import { revalidatePath } from "next/cache"

const deleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
})

export const deleteUserAction = createServerAction()
  .input(deleteUserSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie()

    if (!session) {
      throw new Error("Unauthorized")
    }

    // Check if current user is admin
    const db = getDB()
    const currentUser = await db.query.userTable.findFirst({
      where: eq(userTable.id, session.userId),
    })

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Unauthorized: Admin access required")
    }

    // Prevent self-deletion
    if (input.userId === session.userId) {
      throw new Error("Cannot delete your own account")
    }

    // Check if user exists
    const userToDelete = await db.query.userTable.findFirst({
      where: eq(userTable.id, input.userId),
    })

    if (!userToDelete) {
      throw new Error("User not found")
    }

    // Delete the user
    await db.delete(userTable).where(eq(userTable.id, input.userId))

    // Revalidate the users page
    revalidatePath("/admin")

    return { success: true }
  })
