import { PageHeader } from "@/components/page-header"
import { UsersTable } from "./_components/users/users-table"
import type { Metadata } from "next"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { getUsersAction } from "./_actions/get-users.action"

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage all users",
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const pageSize = typeof params.pageSize === 'string' ? parseInt(params.pageSize, 10) : 10
  const emailFilter = typeof params.email === 'string' ? params.email : ""

  const [data, error] = await getUsersAction({ page, pageSize, emailFilter })

  return (
    <NuqsAdapter>
      <PageHeader items={[{ href: "/admin", label: "Admin" }]} />
      <UsersTable initialData={data ?? undefined} error={error?.message} />
    </NuqsAdapter>
  )
}
