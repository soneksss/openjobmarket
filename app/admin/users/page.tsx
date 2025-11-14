import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTableWithBan } from "@/components/users-table-with-ban"
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
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage professional and company user accounts</p>
      </div>

      <Tabs defaultValue="professionals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="professionals">Professionals</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="professionals">
          <Suspense fallback={<TableSkeleton />}>
            <UsersTableWithBan userType="professional" adminRole={adminUser?.role || "admin2"} />
          </Suspense>
        </TabsContent>

        <TabsContent value="companies">
          <Suspense fallback={<TableSkeleton />}>
            <UsersTableWithBan userType="company" adminRole={adminUser?.role || "admin2"} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
