import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  AnalyticsKPICards,
  UserRegistrationChart,
  JobPostingChart,
  JobsByCategoryChart,
  UserTypesChart,
  TopEmployersTable,
  TopSkillsTable,
  SystemLogsTable,
  UsersByRegionTable,
} from "@/components/analytics-components"
import { getAdminUser } from "@/lib/admin-auth"

function KPICardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-zinc-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="h-6 w-48 bg-zinc-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-zinc-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="h-6 w-48 bg-zinc-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-10 bg-zinc-700 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminAnalyticsPage() {
  const adminUser = await getAdminUser()

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Platform Analytics</h1>
        <p className="text-zinc-400">
          Deep insights into platform performance, user engagement, and system metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded">
        <p className="text-green-400">✅ Static content loads - React server components working</p>
        <p className="text-blue-400">❓ Client components test below...</p>
      </div>
      <AnalyticsKPICards />

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <UserRegistrationChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <JobPostingChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <JobsByCategoryChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <UserTypesChart />
        </Suspense>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton />}>
          <TopEmployersTable />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <TopSkillsTable />
        </Suspense>
      </div>

      {/* Users by Region */}
      <Suspense fallback={<TableSkeleton />}>
        <UsersByRegionTable />
      </Suspense>

      {/* System Logs */}
      <Suspense fallback={<TableSkeleton />}>
        <SystemLogsTable adminRole={adminUser?.role || "admin2"} />
      </Suspense>
    </div>
  )
}
