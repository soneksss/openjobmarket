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
  Users,
  Building2,
  FileText,
  TrendingUp,
  MessageSquare,
  UserCheck,
  Activity,
  AlertTriangle,
  Shield,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"

interface KPIData {
  totalUsers: number
  activeUsers: number
  totalJobs: number
  activeJobs: number
  totalApplications: number
  totalMessages: number
  totalCompanies: number
  totalProfessionals: number
  // Growth percentages (real calculations)
  usersGrowth: string
  companiesGrowth: string
  jobsGrowth: string
  applicationsGrowth: string
}

interface ChartDataPoint {
  date: string
  count: number
  [key: string]: any
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export function AnalyticsKPICards() {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchKPIData() {
    try {
      console.log("[ANALYTICS-KPI] 🚀 Starting KPI data fetch from API...")
      setLoading(true)

      const response = await fetch("/api/admin/analytics")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const apiData = await response.json()
      console.log("[ANALYTICS-KPI] ✅ API response received:", apiData)

      setData(apiData)
      setError(null)
    } catch (err) {
      console.error("[ANALYTICS-KPI] ❌ API fetch failed:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      // Fallback to default values on error
      setData({
        totalUsers: 0,
        activeUsers: 0,
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        totalMessages: 0,
        totalCompanies: 0,
        totalProfessionals: 0,
        usersGrowth: "N/A",
        companiesGrowth: "N/A",
        jobsGrowth: "N/A",
        applicationsGrowth: "N/A",
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
  }, [])

  // Show loading state
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
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

  // Show error state
  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Failed to load analytics data</p>
            <p className="text-sm text-zinc-400 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show data (this should never be null due to fallback)
  if (!data) return null

  console.log("[ANALYTICS-KPI] 🎯 Rendering KPI cards with real data:", data)

  const kpiCards = [
    {
      title: "Total Users",
      value: data.totalUsers,
      icon: Users,
      change: data.usersGrowth,
      changeType: (data.usersGrowth.includes("+") ? "positive" : data.usersGrowth === "N/A" ? "neutral" : "negative") as "positive" | "neutral" | "negative",
    },
    {
      title: "Active Users",
      value: data.activeUsers,
      icon: UserCheck,
      change: `${data.activeUsers}/${data.totalUsers} users`,
      changeType: "neutral" as const,
    },
    {
      title: "Total Jobs",
      value: data.totalJobs,
      icon: FileText,
      change: data.jobsGrowth,
      changeType: (data.jobsGrowth.includes("+") ? "positive" : data.jobsGrowth === "N/A" ? "neutral" : "negative") as "positive" | "neutral" | "negative",
    },
    {
      title: "Active Jobs",
      value: data.activeJobs,
      icon: Activity,
      change: `${data.activeJobs} of ${data.totalJobs} active`,
      changeType: "neutral" as const,
    },
    {
      title: "Total Company Users Registered",
      value: data.totalCompanies,
      icon: Building2,
      change: data.companiesGrowth,
      changeType: (data.companiesGrowth.includes("+") ? "positive" : data.companiesGrowth === "N/A" ? "neutral" : "negative") as "positive" | "neutral" | "negative",
    },
    {
      title: "Total Professional Users Registered",
      value: data.totalProfessionals,
      icon: Users,
      change: `${data.totalProfessionals} registered`,
      changeType: "neutral" as const,
    },
    {
      title: "Applications",
      value: data.totalApplications,
      icon: TrendingUp,
      change: data.applicationsGrowth,
      changeType: (data.applicationsGrowth.includes("+") ? "positive" : data.applicationsGrowth === "N/A" ? "neutral" : "negative") as "positive" | "neutral" | "negative",
    },
    {
      title: "Messages",
      value: data.totalMessages,
      icon: MessageSquare,
      change: `${data.totalMessages} total`,
      changeType: "neutral" as const,
    },
  ]

  return (
    <>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">Platform statistics and user metrics</p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={
                card.changeType === "positive" ? "text-green-600" :
                card.changeType === "negative" ? "text-red-600" :
                "text-zinc-500"
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

export function UserRegistrationChart() {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserRegistrations() {
      const supabase = createClient()

      try {
        const { data: users } = await supabase
          .from("users")
          .select("created_at, user_type")
          .order("created_at", { ascending: true })

        if (users) {
          // Group by day and user type
          const groupedData: { [key: string]: { professionals: number; employers: number } } = {}

          users.forEach((user) => {
            const date = new Date(user.created_at).toISOString().split("T")[0]
            if (!groupedData[date]) {
              groupedData[date] = { professionals: 0, employers: 0 }
            }
            if (user.user_type === "professional") {
              groupedData[date].professionals++
            } else if (user.user_type === "company") {
              groupedData[date].employers++
            }
          })

          const chartData = Object.entries(groupedData)
            .slice(-30) // Last 30 days
            .map(([date, counts]) => ({
              date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              count: counts.professionals + counts.employers,
              professionals: counts.professionals,
              employers: counts.employers,
              total: counts.professionals + counts.employers,
            }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching user registrations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRegistrations()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>User Registrations Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-zinc-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>User Registrations Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="professionals" stroke="#3b82f6" strokeWidth={2} name="Professionals" />
            <Line type="monotone" dataKey="employers" stroke="#10b981" strokeWidth={2} name="Employers" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function JobPostingChart() {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobPostings() {
      const supabase = createClient()

      try {
        const { data: jobs } = await supabase.from("jobs").select("created_at").order("created_at", { ascending: true })

        if (jobs) {
          // Group by day
          const groupedData: { [key: string]: number } = {}

          jobs.forEach((job) => {
            const date = new Date(job.created_at).toISOString().split("T")[0]
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
        console.error("Error fetching job postings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobPostings()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Job Postings Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-zinc-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Job Postings Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} name="Jobs Posted" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function JobsByCategoryChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobsByCategory() {
      const supabase = createClient()

      try {
        const { data: companies } = await supabase
          .from("company_profiles")
          .select("industry")
          .not("industry", "is", null)

        if (companies) {
          // Count jobs by industry
          const industryCount: { [key: string]: number } = {}

          companies.forEach((company) => {
            if (company.industry) {
              industryCount[company.industry] = (industryCount[company.industry] || 0) + 1
            }
          })

          const chartData = Object.entries(industryCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10) // Top 10 industries
            .map(([industry, count]) => ({
              industry,
              count,
            }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching jobs by category:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobsByCategory()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Companies by Industry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-zinc-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Companies by Industry</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="industry" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function UserTypesChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserTypes() {
      const supabase = createClient()

      try {
        const { data: users } = await supabase.from("users").select("user_type")

        if (users) {
          const userTypeCount: { [key: string]: number } = {}

          users.forEach((user) => {
            if (user.user_type) {
              userTypeCount[user.user_type] = (userTypeCount[user.user_type] || 0) + 1
            }
          })

          const chartData = Object.entries(userTypeCount).map(([type, count]) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
          }))

          setData(chartData)
        }
      } catch (error) {
        console.error("Error fetching user types:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserTypes()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>User Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-zinc-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>User Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TopEmployersTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopEmployers() {
      const supabase = createClient()

      try {
        const { data: jobs } = await supabase.from("jobs").select(`
            company_id,
            applications_count,
            company_profiles!inner(company_name)
          `)

        if (jobs) {
          // Group by company and sum applications
          const companyStats: { [key: string]: { name: string; jobCount: number; totalApplications: number } } = {}

          jobs.forEach((job: any) => {
            const companyId = job.company_id
            const companyName = job.company_profiles?.company_name || "Unknown Company"

            if (!companyStats[companyId]) {
              companyStats[companyId] = {
                name: companyName,
                jobCount: 0,
                totalApplications: 0,
              }
            }

            companyStats[companyId].jobCount++
            companyStats[companyId].totalApplications += job.applications_count || 0
          })

          const topEmployers = Object.values(companyStats)
            .sort((a, b) => b.jobCount - a.jobCount)
            .slice(0, 10)

          setData(topEmployers)
        }
      } catch (error) {
        console.error("Error fetching top employers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopEmployers()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Most Active Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Most Active Employers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((employer, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg">
              <div>
                <div className="font-medium">{employer.name}</div>
                <div className="text-sm text-muted-foreground">{employer.jobCount} jobs posted</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{employer.totalApplications}</div>
                <div className="text-sm text-muted-foreground">applications</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TopSkillsTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopSkills() {
      const supabase = createClient()

      try {
        const { data: profiles } = await supabase
          .from("professional_profiles")
          .select("skills")
          .not("skills", "is", null)

        if (profiles) {
          const skillCount: { [key: string]: number } = {}

          profiles.forEach((profile) => {
            if (profile.skills && Array.isArray(profile.skills)) {
              profile.skills.forEach((skill: string) => {
                skillCount[skill] = (skillCount[skill] || 0) + 1
              })
            }
          })

          const topSkills = Object.entries(skillCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }))

          setData(topSkills)
        }
      } catch (error) {
        console.error("Error fetching top skills:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopSkills()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Most Popular Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Most Popular Skills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-400">
                  {index + 1}
                </div>
                <div className="font-medium">{item.skill}</div>
              </div>
              <Badge variant="secondary">{item.count} professionals</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SystemLogsTable({ adminRole }: { adminRole: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSystemLogs() {
      const supabase = createClient()

      try {
        // Get recent admin audit logs
        const { data: logs } = await supabase
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20)

        if (logs) {
          setData(logs)
        }
      } catch (error) {
        console.error("Error fetching system logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSystemLogs()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return <UserCheck className="h-4 w-4 text-green-600" />
      case "logout":
        return <Activity className="h-4 w-4 text-zinc-400" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Shield className="h-4 w-4 text-blue-600" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Login
          </Badge>
        )
      case "logout":
        return <Badge variant="secondary">Logout</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent System Activity</CardTitle>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent system activity found</div>
          ) : (
            data.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getActionIcon(log.action)}
                  <div>
                    <div className="font-medium">{log.action}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.target_type} • {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getActionBadge(log.action)}
                  <div className="text-xs text-muted-foreground">{log.ip_address}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Country flag emojis mapping
const COUNTRY_FLAGS: { [key: string]: string } = {
  BR: "🇧🇷",
  GB: "🇬🇧",
  PT: "🇵🇹",
  US: "🇺🇸",
  CA: "🇨🇦",
  AU: "🇦🇺",
  NZ: "🇳🇿",
  IE: "🇮🇪",
  ES: "🇪🇸",
  FR: "🇫🇷",
  DE: "🇩🇪",
  IT: "🇮🇹",
  NL: "🇳🇱",
  BE: "🇧🇪",
  CH: "🇨🇭",
  AT: "🇦🇹",
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
  PL: "🇵🇱",
  CZ: "🇨🇿",
  HU: "🇭🇺",
  RO: "🇷🇴",
  BG: "🇧🇬",
  GR: "🇬🇷",
  TR: "🇹🇷",
  RU: "🇷🇺",
  UA: "🇺🇦",
  IN: "🇮🇳",
  CN: "🇨🇳",
  JP: "🇯🇵",
  KR: "🇰🇷",
  SG: "🇸🇬",
  MY: "🇲🇾",
  TH: "🇹🇭",
  PH: "🇵🇭",
  ID: "🇮🇩",
  VN: "🇻🇳",
  ZA: "🇿🇦",
  EG: "🇪🇬",
  NG: "🇳🇬",
  KE: "🇰🇪",
  MX: "🇲🇽",
  AR: "🇦🇷",
  CL: "🇨🇱",
  CO: "🇨🇴",
  PE: "🇵🇪",
  VE: "🇻🇪",
  IL: "🇮🇱",
  AE: "🇦🇪",
  SA: "🇸🇦",
}

export function UsersByRegionTable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsersByRegion() {
      try {
        console.log("[ANALYTICS-REGION] Fetching users by region...")
        setLoading(true)

        const response = await fetch("/api/admin/analytics/users-by-region")

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const apiData = await response.json()
        console.log("[ANALYTICS-REGION] API response received:", apiData)

        setData(apiData)
        setError(null)
      } catch (err) {
        console.error("[ANALYTICS-REGION] API fetch failed:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setData({
          byCountry: [],
          clusters: [],
          totalWithLocation: 0,
          totalWithoutLocation: 0,
          summary: { uniqueCountries: 0, topCountry: "None", topCountryCount: 0 }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsersByRegion()
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Users by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Users by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-900/20 border border-red-700 rounded">
            <p className="font-medium text-red-400">Error loading regional data</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { byCountry, totalWithLocation, totalWithoutLocation, summary, message } = data

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Users by Region</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution of registered users across {summary.uniqueCountries} countries
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalWithLocation.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">users with location</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {message && (
          <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded">
            <p className="text-blue-400 font-medium mb-2">📋 Setup Required</p>
            <p className="text-sm text-blue-300">{message}</p>
            <p className="text-xs text-blue-400 mt-2">
              After running the migration, use <code className="bg-zinc-800 px-1 rounded">scripts/populate-user-countries.sql</code> to populate country data.
            </p>
          </div>
        )}

        {totalWithoutLocation > 0 && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700 rounded text-sm">
            <p className="text-amber-300">
              ⚠️ <strong>{totalWithoutLocation}</strong> users have no location data yet.
              They will be included once location is added.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {byCountry.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              {message ? "Run the migration to enable regional analytics" : "No user location data available yet"}
            </div>
          ) : (
            byCountry.map((country: any, index: number) => {
              const flag = COUNTRY_FLAGS[country.country_code] || "🌍"
              const percentage = ((country.count / totalWithLocation) * 100).toFixed(1)

              return (
                <div key={country.country_code} className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-400">
                      {index + 1}
                    </div>
                    <div className="text-2xl">{flag}</div>
                    <div>
                      <div className="font-medium">{country.country_name}</div>
                      <div className="text-sm text-muted-foreground">{country.country_code}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">{country.count.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{percentage}%</div>
                    </div>
                    <div className="w-24 bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {byCountry.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.uniqueCountries}</div>
                <div className="text-xs text-muted-foreground">Countries</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.topCountry}</div>
                <div className="text-xs text-muted-foreground">Top Country</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{summary.topCountryCount}</div>
                <div className="text-xs text-muted-foreground">Users in Top Country</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
