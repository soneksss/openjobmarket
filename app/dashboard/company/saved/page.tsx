import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookmarkIcon, MapPin, Briefcase, Building, Calendar, DollarSign, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default async function CompanySavedJobsPage() {
  try {
    console.log("[COMPANY-SAVED-JOBS] Page loading...")
    const supabase = await createClient()

    // Get current user with error handling
    let user = null
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log("[COMPANY-SAVED-JOBS] Auth check result:", { authUser: !!authUser, authError })
      if (!authError && authUser) {
        user = authUser
      }
    } catch (error) {
      console.error("[COMPANY-SAVED-JOBS] Error getting user:", error)
    }

    if (!user) {
      console.log("[COMPANY-SAVED-JOBS] No user found, redirecting to login")
      redirect("/auth/login")
    }

    console.log("[COMPANY-SAVED-JOBS] User authenticated:", user.email)

  // Get user's company profile
  let profile = null
  let savedJobs: any[] = []

  try {
    const { data: profileData, error: profileError } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.error("[COMPANY-SAVED-JOBS] Error fetching profile:", profileError)
    } else {
      profile = profileData
    }

    if (profile) {
      // Get saved jobs with full job details
      const { data: savedJobsData, error: savedJobsError } = await supabase
        .from("saved_jobs")
        .select(`
          id,
          saved_at,
          job_id,
          jobs!inner (
            *,
            company_profiles (
              company_name,
              location,
              industry,
              logo_url,
              user_id
            ),
            homeowner_profiles (
              first_name,
              last_name,
              location,
              user_id
            )
          )
        `)
        .eq("company_id", profile.id)
        .order("saved_at", { ascending: false })

      if (savedJobsError) {
        console.error("[COMPANY-SAVED-JOBS] Error fetching saved jobs:", savedJobsError)
      } else {
        // Extract jobs from saved_jobs and filter only active jobs
        savedJobs = (savedJobsData || [])
          .map((savedJob: any) => ({
            ...savedJob.jobs,
            saved_at: savedJob.saved_at,
            saved_job_id: savedJob.id
          }))
          .filter((job: any) => {
            if (!job.is_active) return false
            if (job.expires_at && new Date(job.expires_at) < new Date()) return false
            return true
          })
      }
    }
  } catch (error) {
    console.error("[COMPANY-SAVED-JOBS] Unexpected error:", error)
    // Don't throw - just show empty state
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            asChild
          >
            <Link href="/dashboard/company">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg">
                <BookmarkIcon className="h-6 w-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Saved Jobs</h1>
                <p className="text-gray-600">
                  {savedJobs.length} active {savedJobs.length === 1 ? 'job' : 'jobs'} saved
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/tasks">
                <Briefcase className="h-4 w-4 mr-2" />
                Browse More Jobs
              </Link>
            </Button>
          </div>
        </div>

        {/* Jobs List */}
        {savedJobs.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookmarkIcon className="h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Saved Jobs</h2>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                You haven't saved any jobs yet. Browse available jobs and click the bookmark icon to save them here.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/tasks">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {savedJobs.map((job) => {
              // Determine poster type (company or homeowner)
              const isCompanyJob = !!job.company_profiles
              const isHomeownerJob = !!job.homeowner_profiles

              const posterName = isCompanyJob
                ? job.company_profiles.company_name
                : isHomeownerJob
                ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}`
                : "Unknown Poster"

              const posterLocation = isCompanyJob
                ? job.company_profiles.location
                : isHomeownerJob
                ? job.homeowner_profiles.location
                : job.location

              const posterIndustry = isCompanyJob ? job.company_profiles.industry : "Homeowner"

              const logoUrl = isCompanyJob ? job.company_profiles.logo_url : null

              const posterUserId = isCompanyJob
                ? job.company_profiles.user_id
                : isHomeownerJob
                ? job.homeowner_profiles.user_id
                : null

              return (
                <Card
                  key={job.id}
                  className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Poster Logo/Avatar */}
                      <div className="flex-shrink-0">
                        {logoUrl ? (
                          <div className="h-16 w-16 relative rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={logoUrl}
                              alt={posterName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                              {posterName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {/* Job Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {job.title}
                            </h3>
                            <p className="text-gray-700 font-medium mb-1">
                              {posterName}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {posterLocation || job.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {posterIndustry}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Posted {formatDate(job.created_at)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-4">
                            Saved {formatDate(job.saved_at)}
                          </Badge>
                        </div>

                        {/* Salary */}
                        {formatSalary(job.salary_min, job.salary_max) && (
                          <div className="flex items-center gap-2 text-green-600 font-semibold mb-3">
                            <DollarSign className="h-4 w-4" />
                            {formatSalary(job.salary_min, job.salary_max)}
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="bg-blue-50">
                            {job.job_type}
                          </Badge>
                          {job.experience_level && (
                            <Badge variant="outline" className="bg-purple-50">
                              {job.experience_level}
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-green-50">
                            {job.work_location}
                          </Badge>
                          {isHomeownerJob && (
                            <Badge variant="outline" className="bg-orange-50">
                              Homeowner Task
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href={`/jobs/${job.id}`}>
                              View Details & Apply
                            </Link>
                          </Button>
                          {isCompanyJob && posterUserId && (
                            <Button variant="outline" asChild>
                              <Link href={`/company/${posterUserId}`}>
                                View Company
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
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
  } catch (error) {
    console.error("[COMPANY-SAVED-JOBS] Fatal error:", error)
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BookmarkIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Saved Jobs</h2>
            <p className="text-gray-600 mb-6">
              There was an error loading your saved jobs. Please try again.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/dashboard/company">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/tasks">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
