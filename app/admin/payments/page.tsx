import { Suspense } from "react"
import { PaymentsOverview, RevenueChart, TransactionVolumeChart } from "@/components/payments-overview"
import { PaymentsTable } from "@/components/payments-table"
import { getAdminUser } from "@/lib/admin-auth"
import { Card, CardContent } from "@/components/ui/card"

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

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

export default async function AdminPaymentsPage() {
  const adminUser = await getAdminUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Tracking</h1>
        <p className="text-muted-foreground">Monitor revenue, transactions, and payment analytics</p>
      </div>

      {/* Overview Stats */}
      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <PaymentsOverview />
      </Suspense>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <TransactionVolumeChart />
        </Suspense>
      </div>

      {/* Transactions Table */}
      <Suspense fallback={<TableSkeleton />}>
        <PaymentsTable adminRole={adminUser?.role || "admin2"} />
      </Suspense>
    </div>
  )
}
