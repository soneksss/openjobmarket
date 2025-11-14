import { Suspense } from "react"
import { ReportedUsersInterface } from "@/components/reported-users-interface"
import { getAdminUser } from "@/lib/admin-auth"
import { Card, CardContent } from "@/components/ui/card"
import { redirect } from "next/navigation"

function ReportedUsersSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AdminReportedUsersPage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect('/admin/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reported Users</h1>
        <p className="text-muted-foreground">
          Review user reports and manage blocking/unblocking actions
        </p>
      </div>

      <Suspense fallback={<ReportedUsersSkeleton />}>
        <ReportedUsersInterface adminUser={adminUser} />
      </Suspense>
    </div>
  )
}