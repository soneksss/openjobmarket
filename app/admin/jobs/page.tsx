import { Suspense } from "react"
import { JobsTable } from "@/components/jobs-table"
import { getAdminUser } from "@/lib/admin-auth"
import { Card, CardContent } from "@/components/ui/card"

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminJobsPage() {
  const adminUser = await getAdminUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
        <p className="text-muted-foreground">Monitor and manage job postings across the platform</p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <JobsTable adminRole={adminUser?.role || "admin2"} />
      </Suspense>
    </div>
  )
}
