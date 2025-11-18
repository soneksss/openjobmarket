// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  CompanyAnalyticsKPICards,
  JobPerformanceChart,
  ApplicationsOverTimeChart,
  ApplicationStatusChart,
  TopPerformingJobsTable,
  RecentActivityTable,
} from "@/components/company-analytics-components"

function KPICardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
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

export default async function CompanyAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Analytics</h1>
          <p className="text-muted-foreground">
            Track your company performance, job views, applications, and engagement metrics
          </p>
        </div>

        {/* KPI Cards */}
        <Suspense fallback={<KPICardsSkeleton />}>
          <CompanyAnalyticsKPICards companyId={profile.id} />
        </Suspense>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Suspense fallback={<ChartSkeleton />}>
            <ApplicationsOverTimeChart companyId={profile.id} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ApplicationStatusChart companyId={profile.id} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <JobPerformanceChart companyId={profile.id} />
          </Suspense>
        </div>

        {/* Tables Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<TableSkeleton />}>
            <TopPerformingJobsTable companyId={profile.id} />
          </Suspense>
          <Suspense fallback={<TableSkeleton />}>
            <RecentActivityTable companyId={profile.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
