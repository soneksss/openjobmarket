"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Eye,
  Users,
  Briefcase,
  TrendingUp,
  UserCheck,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import Link from "next/link"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

interface KPIData {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  pendingApplications: number
  profileViews: number
  totalJobViews: number
  avgApplicationsPerJob: number
  acceptanceRate: number
}

interface ChartDataPoint {
  date: string
  count: number
  [key: string]: any
}

export function CompanyAnalyticsKPICards({ companyId }: { companyId: string }) {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchKPIData() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch all data in parallel
      const [jobsResult, applicationsResult, profileViewsResult, jobViewsResult] = await Promise.all([
        // Get jobs count
        supabase
          .from("jobs")
          .select("id, is_active, views_count", { count: "exact" })
          .eq("company_id", companyId),

        // Get applications
        supabase
          .from("job_applications")
          .select("id, status, job_id!inner(company_id)", { count: "exact" })
          .eq("job_id.company_id", companyId),

        // Get profile views (if tracking exists)
        supabase
          .from("company_profile_views")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),

        // Get total job views
        supabase
          .from("jobs")
          .select("views_count")
          .eq("company_id", companyId)
      ])

      const jobs = jobsResult.data || []
      const applications = applicationsResult.data || []
      const activeJobs = jobs.filter(job => job.is_active).length
      const pendingApplications = applications.filter(app => app.status === "pending").length
      const acceptedApplications = applications.filter(app => app.status === "accepted").length

      // Calculate total job views
      const totalJobViews = jobs.reduce((sum, job) => sum + (job.views_count || 0), 0)

      // Calculate acceptance rate
      const acceptanceRate = applications.length > 0
        ? Math.round((acceptedApplications / applications.length) * 100)
        : 0

      const kpiData: KPIData = {
        totalJobs: jobs.length,
        activeJobs,
        totalApplications: applications.length,
        pendingApplications,
        profileViews: profileViewsResult.count || 0,
        totalJobViews,
        avgApplicationsPerJob: jobs.length > 0 ? Math.round(applications.length / jobs.length) : 0,
        acceptanceRate,
      }

      setData(kpiData)
    } catch (error) {
      console.error("Error fetching company analytics:", error)
      // Fallback data
      setData({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        pendingApplications: 0,
        profileViews: 0,
        totalJobViews: 0,
        avgApplicationsPerJob: 0,
        acceptanceRate: 0,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchKPIData()
  }

  useEffect(() => {
    fetchKPIData()
  }, [companyId])

  if (loading) {
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

  if (!data) return null

  const kpiCards = [
    {
      title: "Profile Views",
      value: data.profileViews,
      icon: Eye,
      change: `${data.profileViews} total views`,
      changeType: "neutral" as const,
    },
    {
      title: "Total Job Views",
      value: data.totalJobViews,
      icon: Eye,
      change: `Across ${data.totalJobs} jobs`,
      changeType: "neutral" as const,
    },
    {
      title: "Active Jobs",
      value: data.activeJobs,
      icon: Briefcase,
      change: `${data.totalJobs} total`,
      changeType: "neutral" as const,
    },
    {
      title: "Total Applications",
      value: data.totalApplications,
      icon: Users,
      change: `${data.pendingApplications} pending`,
      changeType: "neutral" as const,
    },
    {
      title: "Avg Apps per Job",
      value: data.avgApplicationsPerJob,
      icon: TrendingUp,
      change: `Across all jobs`,
      changeType: "neutral" as const,
    },
    {
      title: "Acceptance Rate",
      value: `${data.acceptanceRate}%`,
      icon: UserCheck,
      change: `From ${data.totalApplications} apps`,
      changeType: data.acceptanceRate >= 20 ? "positive" : "neutral" as const,
    },
  ]

  return (
    <>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Performance Overview</h2>
          <p className="text-sm text-muted-foreground">Your company metrics and engagement statistics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={
                  card.changeType === "positive" ? "text-green-600" :
                  card.changeType === "negative" ? "text-red-600" :
                  "text-gray-500"
                }>
                  {card.change}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function ApplicationsOverTimeChart({ companyId }: { companyId: string }) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchApplications() {
      const supabase = createClient()

      try {
        // Get all applications for this company's jobs
        const { data: applications } = await supabase
          .from("job_applications")
          .select("applied_at, job_id!inner(company_id)")
          .eq("job_id.company_id", companyId)
          .order("applied_at", { ascending: true })

        if (applications) {
          // Group by day
          const groupedData: { [key: string]: number } = {}

          applications.forEach((app) => {
            const date = new Date(app.applied_at).toISOString().split("T")[0]
            groupedData[date] = (groupedData[date] || 0) + 1
          })

          const chartData = Object.entries(groupedData)
            .slice(-30) // Last 30 days
            .map(([date, count]) => ({
              date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              count,
            }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching applications over time:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applications Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No application data available yet</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Applications" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function ApplicationStatusChart({ companyId }: { companyId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchApplicationStatus() {
      const supabase = createClient()

      try {
        const { data: applications } = await supabase
          .from("job_applications")
          .select("status, job_id!inner(company_id)")
          .eq("job_id.company_id", companyId)

        if (applications) {
          const statusCount: { [key: string]: number } = {}

          applications.forEach((app) => {
            statusCount[app.status] = (statusCount[app.status] || 0) + 1
          })

          const chartData = Object.entries(statusCount).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count,
            status: status,
          }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching application status:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplicationStatus()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b"
      case "reviewed":
        return "#3b82f6"
      case "interview":
        return "#8b5cf6"
      case "accepted":
        return "#10b981"
      case "rejected":
        return "#ef4444"
      default:
        return "#6b7280"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Status Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">Current distribution of all applications</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications received yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center">
              {data.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function JobPerformanceChart({ companyId }: { companyId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobPerformance() {
      const supabase = createClient()

      try {
        // Get jobs with their application counts
        const { data: jobs } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            views_count,
            created_at
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(10)

        if (jobs) {
          // Get application counts for each job
          const jobIds = jobs.map(job => job.id)
          const { data: applications } = await supabase
            .from("job_applications")
            .select("job_id")
            .in("job_id", jobIds)

          // Count applications per job
          const appCount: { [key: string]: number } = {}
          applications?.forEach(app => {
            appCount[app.job_id] = (appCount[app.job_id] || 0) + 1
          })

          const chartData = jobs.map(job => ({
            title: job.title.length > 20 ? job.title.substring(0, 20) + "..." : job.title,
            views: job.views_count || 0,
            applications: appCount[job.id] || 0,
          }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching job performance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobPerformance()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Job Performance Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">Views and applications for your recent jobs</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No job data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#3b82f6" name="Views" />
              <Bar dataKey="applications" fill="#10b981" name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function TopPerformingJobsTable({ companyId }: { companyId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopJobs() {
      const supabase = createClient()

      try {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, title, views_count, is_active, created_at")
          .eq("company_id", companyId)
          .order("views_count", { ascending: false })
          .limit(5)

        if (jobs) {
          // Get application counts
          const jobIds = jobs.map(job => job.id)
          const { data: applications } = await supabase
            .from("job_applications")
            .select("job_id")
            .in("job_id", jobIds)

          const appCount: { [key: string]: number } = {}
          applications?.forEach(app => {
            appCount[app.job_id] = (appCount[app.job_id] || 0) + 1
          })

          const enrichedJobs = jobs.map(job => ({
            ...job,
            applications: appCount[job.id] || 0,
          }))

          setData(enrichedJobs)
        }
      } catch (error) {
        console.error("Error fetching top jobs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopJobs()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Jobs</CardTitle>
        <p className="text-sm text-muted-foreground">Ranked by total views</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No jobs posted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((job, index) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{job.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {job.views_count || 0} views
                      </span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {job.applications} applications
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {job.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/jobs/${job.id}/edit`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentActivityTable({ companyId }: { companyId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentActivity() {
      const supabase = createClient()

      try {
        const { data: applications } = await supabase
          .from("job_applications")
          .select(`
            id,
            status,
            applied_at,
            job_id,
            jobs!inner(title, company_id),
            professional_profiles(first_name, last_name)
          `)
          .eq("jobs.company_id", companyId)
          .order("applied_at", { ascending: false })
          .limit(10)

        setData(applications || [])
      } catch (error) {
        console.error("Error fetching recent activity:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentActivity()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "interview":
        return <UserCheck className="h-4 w-4 text-purple-600" />
      case "reviewed":
        return <Eye className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: "bg-orange-100 text-orange-800",
      reviewed: "bg-blue-100 text-blue-800",
      interview: "bg-purple-100 text-purple-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    }
    return statusMap[status] || "bg-gray-100 text-gray-800"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Application Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Latest applications to your jobs</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {activity.professional_profiles?.first_name} {activity.professional_profiles?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      Applied to: {activity.jobs?.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.applied_at).toLocaleDateString()} at {new Date(activity.applied_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusBadge(activity.status)}>
                    {activity.status}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/applications/${activity.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
