// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, Plus, Briefcase } from "lucide-react"

export default async function HomeownerJobsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get homeowner profile
  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get all jobs posted by this homeowner
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      short_description,
      location,
      salary_min,
      salary_max,
      salary_frequency,
      is_active,
      expires_at,
      created_at,
      updated_at,
      is_tradespeople_job,
      work_location,
      job_type
    `)
    .eq("homeowner_id", profile.id)
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.error("[HOMEOWNER-JOBS] Error fetching jobs:", jobsError)
  }

  const allJobs = jobs || []

  // Get application counts for each job
  const jobIds = allJobs.map((job) => job.id)
  const { data: applications } = await supabase
    .from("job_applications")
    .select("job_id")
    .in("job_id", jobIds)

  // Count applications per job
  const applicationCountsMap = new Map()
  applications?.forEach((app) => {
    const count = applicationCountsMap.get(app.job_id) || 0
    applicationCountsMap.set(app.job_id, count + 1)
  })

  const getStatusInfo = (job: any) => {
    const now = new Date()
    const expiresAt = job.expires_at ? new Date(job.expires_at) : null
    const isExpired = expiresAt && expiresAt < now

    if (!job.is_active || isExpired) {
      return { text: "Expired", color: "bg-gray-100 text-gray-800" }
    }

    return { text: "Active", color: "bg-green-100 text-green-800" }
  }

  const formatExpiryDate = (expiresAt: string | undefined) => {
    if (!expiresAt) return null
    const date = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return `Expired ${Math.abs(daysUntilExpiry)} days ago`
    } else if (daysUntilExpiry === 0) {
      return "Expires today"
    } else if (daysUntilExpiry === 1) {
      return "Expires tomorrow"
    } else {
      return `Expires in ${daysUntilExpiry} days`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard/homeowner">
              <Button variant="ghost" className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Your Jobs</h1>
            <p className="text-gray-600 mt-1">
              Manage all your job postings and view applications
            </p>
          </div>
          <Link href="/dashboard/homeowner/post-job">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{allJobs.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {allJobs.filter((job) => getStatusInfo(job).text === "Active").length}
                </h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{applications?.length || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Jobs List */}
        {allJobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
            <p className="text-gray-600 mb-6">
              Post your first job to get started with finding help for your tasks
            </p>
            <Link href="/dashboard/homeowner/post-job">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Post Your First Job
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {allJobs.map((job) => {
              const statusInfo = getStatusInfo(job)
              const expiryText = formatExpiryDate(job.expires_at)
              const applicationCount = applicationCountsMap.get(job.id) || 0

              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
                          {job.is_tradespeople_job && (
                            <Badge className="bg-purple-100 text-purple-800">Tradespeople</Badge>
                          )}
                          {job.job_type && (
                            <Badge variant="outline">
                              {job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1)}
                            </Badge>
                          )}
                          {applicationCount > 0 && (
                            <Badge variant="secondary">{applicationCount} applications</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {job.short_description || job.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          {job.salary_min && job.salary_max && (
                            <span>
                              £{job.salary_min} - £{job.salary_max}
                              {job.salary_frequency && ` ${job.salary_frequency.replace("_", " ")}`}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Posted {new Date(job.created_at).toLocaleDateString()}
                          </span>
                          {expiryText && (
                            <span className={statusInfo.text === "Expired" ? "text-red-600 font-medium" : ""}>
                              {expiryText}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/dashboard/homeowner/jobs/${job.id}`}>
                        <Button variant="outline" size="sm" className="ml-4">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
