import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, UserCheck, Users, Briefcase, Wrench, Home, Building2 } from "lucide-react"
import { getAdminUser } from "@/lib/admin-auth"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

// Placeholder components for loading states
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </CardTitle>
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

async function StatsCards() {
  const supabase = await createClient()

  // Get counts for all user types and other stats
  const [
    paymentsResult,
    recentUsersResult,
    employersResult,
    jobseekersResult,
    tradespeopleResult,
    homeownersResult,
    totalUsersResult
  ] = await Promise.all([
    // Get total payment amounts from enquiry_payments table
    supabase
      .from('enquiry_payments')
      .select('amount')
      .eq('payment_status', 'completed'),

    // Count users active in last 15 minutes (more realistic "online" status)
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('last_sign_in_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()),

    // Count Employers
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'employer'),

    // Count Jobseekers
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'jobseeker'),

    // Count Tradespeople (contractors)
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'contractor'),

    // Count Homeowners
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'homeowner'),

    // Total users (excluding admins)
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('user_type', 'admin')
  ])

  // Calculate total payments
  const totalPayments = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

  const stats = {
    totalPayments: totalPayments,
    usersOnline: recentUsersResult.count || 0,
    employers: employersResult.count || 0,
    jobseekers: jobseekersResult.count || 0,
    tradespeople: tradespeopleResult.count || 0,
    homeowners: homeownersResult.count || 0,
    totalUsers: totalUsersResult.count || 0
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Online</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersOnline}</div>
            <p className="text-xs text-muted-foreground">Active in last 15 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue from enquiry fees</p>
          </CardContent>
        </Card>
      </div>

      {/* User Types Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/admin/users?filter=employer">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employers</CardTitle>
                <Building2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.employers}</div>
                <p className="text-xs text-muted-foreground">Companies hiring</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users?filter=jobseeker">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jobseekers</CardTitle>
                <Briefcase className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.jobseekers}</div>
                <p className="text-xs text-muted-foreground">Looking for work</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users?filter=contractor">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tradespeople</CardTitle>
                <Wrench className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tradespeople}</div>
                <p className="text-xs text-muted-foreground">Offering services</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users?filter=homeowner">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Homeowners</CardTitle>
                <Home className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.homeowners}</div>
                <p className="text-xs text-muted-foreground">Finding tradespeople</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {adminUser.name ? `${adminUser.name} ${adminUser.surname}` : adminUser.email}</p>
        </div>
        <div className="text-sm text-muted-foreground">Role: {adminUser.role}</div>
      </div>

      {/* Stats Cards */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <StatsCards />
      </Suspense>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity to display.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users" className="block w-full text-left text-sm text-primary hover:underline">
              View all users
            </Link>
            <Link href="/admin/jobs" className="block w-full text-left text-sm text-primary hover:underline">
              Manage jobs
            </Link>
            <Link href="/admin/payments" className="block w-full text-left text-sm text-primary hover:underline">
              View payments
            </Link>
            <Link href="/admin/analytics" className="block w-full text-left text-sm text-primary hover:underline">
              View analytics
            </Link>
            <Link href="/admin/settings" className="block w-full text-left text-sm text-primary hover:underline">
              System settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
