"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Clock, RefreshCw, Calendar } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

interface ExpiringJob {
  id: string
  title: string
  created_at: string
  recruitment_timeline: string
  applications_count: number
  expires_at?: string
  days_until_expiration?: number
}

interface JobExpirationAlertsProps {
  companyId: string
}

export default function JobExpirationAlerts({ companyId }: JobExpirationAlertsProps) {
  const [expiringJobs, setExpiringJobs] = useState<ExpiringJob[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchExpiringJobs()
  }, [companyId])

  const fetchExpiringJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, created_at, recruitment_timeline")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      const jobIds = (data || []).map((job) => job.id)
      const { data: applicationCounts } = await supabase.from("job_applications").select("job_id").in("job_id", jobIds)

      const applicationCountsMap = new Map()
      applicationCounts?.forEach((app) => {
        const count = applicationCountsMap.get(app.job_id) || 0
        applicationCountsMap.set(app.job_id, count + 1)
      })

      const jobsWithExpiration = (data || [])
        .map((job) => {
          const createdAt = new Date(job.created_at)
          const timelineMap: { [key: string]: number } = {
            "1-2 weeks": 14,
            "2-4 weeks": 28,
            "1-2 months": 60,
            "2-3 months": 90,
            "3+ months": 120,
          }

          const daysToAdd = timelineMap[job.recruitment_timeline] || 30
          const expiresAt = new Date(createdAt.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
          const now = new Date()
          const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

          return {
            ...job,
            applications_count: applicationCountsMap.get(job.id) || 0,
            expires_at: expiresAt.toISOString(),
            days_until_expiration: daysUntilExpiration,
          }
        })
        .filter((job) => job.days_until_expiration <= 7)

      setExpiringJobs(jobsWithExpiration)
    } catch (error) {
      console.error("Error fetching expiring jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return "text-red-600 bg-red-50 border-red-200"
    if (days <= 2) return "text-orange-600 bg-orange-50 border-orange-200"
    return "text-yellow-600 bg-yellow-50 border-yellow-200"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking job expirations...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expiringJobs.length === 0) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-orange-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Job Expiration Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringJobs.map((job) => (
          <Alert key={job.id} className={`${getUrgencyColor(job.days_until_expiration || 0)} border`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{job.title}</p>
                  <div className="flex items-center space-x-4 text-sm mt-1">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Expires {job.expires_at && formatDate(job.expires_at)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {job.applications_count || 0} applications
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">
                    {(job.days_until_expiration || 0) <= 0
                      ? "This job has expired and is no longer visible to candidates."
                      : `This job expires in ${job.days_until_expiration} day${
                          job.days_until_expiration === 1 ? "" : "s"
                        }.`}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/jobs/${job.id}/extend`}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Extend
                    </Link>
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
        <div className="pt-2 border-t border-orange-200">
          <p className="text-xs text-orange-700">
            Jobs that expire are automatically removed from the job map and marked as inactive. You can extend them at
            any time to make them visible again.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
