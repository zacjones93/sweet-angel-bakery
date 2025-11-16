"use client"

import { DataTable } from "@/components/data-table"
import { columns, type User } from "./columns"
import { Input } from "@/components/ui/input"
import { PAGE_SIZE_OPTIONS } from "../../admin-constants"
import { useQueryState } from "nuqs"
import { useRouter } from "next/navigation"

type UsersData = {
  users: User[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

type UsersTableProps = {
  initialData: UsersData | undefined
  error: string | undefined
}

export function UsersTable({ initialData, error }: UsersTableProps) {
  const router = useRouter()
  const [page, setPage] = useQueryState("page", { defaultValue: "1" })
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: PAGE_SIZE_OPTIONS[0].toString() })
  const [emailFilter, setEmailFilter] = useQueryState("email", { defaultValue: "" })

  const handlePageChange = (newPage: number) => {
    setPage((newPage + 1).toString()) // Convert from 0-based to 1-based and store as string
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize.toString())
    setPage("1") // Reset to first page when changing page size
  }

  const handleEmailFilterChange = (value: string) => {
    setEmailFilter(value)
    setPage("1") // Reset to first page when filtering
  }

  const getRowHref = (user: User) => {
    return `/admin/users/${user.id}`
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="p-6 w-full min-w-0 flex flex-col overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold">Users</h1>
        <Input
          placeholder="Filter emails..."
          type="search"
          value={emailFilter}
          onChange={(event) => handleEmailFilterChange(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="mt-8 flex-1 min-h-0">
        <div className="space-y-4 h-full">
          {error ? (
            <div>Error: {error}</div>
          ) : !initialData ? (
            <div>No users found</div>
          ) : (
            <div className="w-full min-w-0">
              <DataTable
                columns={columns({ onRefresh: handleRefresh })}
                data={initialData.users}
                pageCount={initialData.totalPages}
                pageIndex={parseInt(page) - 1}
                pageSize={parseInt(pageSize)}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                totalCount={initialData.totalCount}
                itemNameSingular="user"
                itemNamePlural="users"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                getRowHref={getRowHref}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
