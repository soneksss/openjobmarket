import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@/lib/server"
import { DeletionAnalyticsTable } from "@/components/admin/deletion-analytics-table"
import { DeletionReasonChart } from "@/components/admin/deletion-reason-chart"
import { AlertTriangle, Users, TrendingDown, Calendar } from "lucide-react"

async function getDeletionStats() {
  const supabase = await createClient()

  try {
    // Get total deletions
    const { count: totalDeletions } = await supabase
      .from('account_deletion_reasons')
      .select('*', { count: 'exact', head: true })

    // Get deletions this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: deletionsThisMonth } = await supabase
      .from('account_deletion_reasons')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get most common reason
    const { data: reasonCounts } = await supabase
      .from('account_deletion_reasons')
      .select('primary_reason')

    const reasonMap = new Map<string, number>()
    reasonCounts?.forEach((row) => {
      const count = reasonMap.get(row.primary_reason) || 0
      reasonMap.set(row.primary_reason, count + 1)
    })

    let mostCommonReason = 'N/A'
    let maxCount = 0
    reasonMap.forEach((count, reason) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonReason = reason
      }
    })

    // Get average days as member
    const { data: avgData } = await supabase
      .from('account_deletion_reasons')
      .select('days_as_member')

    const avgDays = avgData?.length
      ? Math.round(
          avgData.reduce((sum, row) => sum + (row.days_as_member || 0), 0) / avgData.length
        )
      : 0

    return {
      totalDeletions: totalDeletions || 0,
      deletionsThisMonth: deletionsThisMonth || 0,
      mostCommonReason,
      avgDaysAsMember: avgDays,
    }
  } catch (error) {
    console.error('Error fetching deletion stats:', error)
    return {
      totalDeletions: 0,
      deletionsThisMonth: 0,
      mostCommonReason: 'N/A',
      avgDaysAsMember: 0,
    }
  }
}

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        <Icon className="h-4 w-4 text-zinc-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
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

async function StatsCards() {
  const stats = await getDeletionStats()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Deletions"
        value={stats.totalDeletions}
        icon={Users}
        description="All-time account deletions"
      />
      <StatCard
        title="This Month"
        value={stats.deletionsThisMonth}
        icon={Calendar}
        description="Deletions in current month"
      />
      <StatCard
        title="Most Common Reason"
        value={stats.mostCommonReason.replace(/_/g, ' ')}
        icon={AlertTriangle}
        description="Primary deletion reason"
      />
      <StatCard
        title="Avg. Days as Member"
        value={stats.avgDaysAsMember}
        icon={TrendingDown}
        description="Before account deletion"
      />
    </div>
  )
}

export default async function DeletionAnalyticsPage() {
  // Require admin access
  await requireAdmin()

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Account Deletion Analytics</h1>
        <p className="text-zinc-400">
          Insights into why users are leaving the platform and retention opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Deletion Reasons Chart */}
      <Suspense fallback={<Card className="bg-zinc-900 border-zinc-800 h-[400px] animate-pulse" />}>
        <DeletionReasonChart />
      </Suspense>

      {/* Deletion Records Table */}
      <Suspense fallback={<Card className="bg-zinc-900 border-zinc-800 h-[600px] animate-pulse" />}>
        <DeletionAnalyticsTable />
      </Suspense>
    </div>
  )
}
