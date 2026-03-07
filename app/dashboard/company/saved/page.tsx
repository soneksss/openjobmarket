// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            asChild
          >
            <Link href="/dashboard/company">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            Saved Jobs
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Count Badge */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            {savedJobs.length} {savedJobs.length === 1 ? 'job' : 'jobs'} saved
          </p>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            asChild
          >
            <Link href="/?tab=jobs_tasks&autoSearch=true">
              <Briefcase className="h-4 w-4 mr-1.5" />
              Browse Jobs
            </Link>
          </Button>
        </div>

        {/* Jobs List */}
        {savedJobs.length === 0 ? (
          <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-8">
            <div className="text-center text-slate-400">
              <BookmarkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium text-slate-300 mb-1">No Saved Jobs</h3>
              <p className="text-sm mb-4">Browse jobs and tap the bookmark icon to save them here.</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <Link href="/?tab=jobs_tasks&autoSearch=true">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
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

              const logoUrl = isCompanyJob ? job.company_profiles.logo_url : null

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:bg-slate-700/80 transition-all duration-200">
                    {/* Poster Logo/Avatar */}
                    <div className="flex-shrink-0">
                      {logoUrl ? (
                        <div className="h-12 w-12 relative rounded-lg overflow-hidden bg-slate-700 border border-slate-600">
                          <Image
                            src={logoUrl}
                            alt={posterName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-12 w-12 border border-slate-600">
                          <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold text-sm">
                            {posterName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate mb-0.5">
                            {job.title}
                          </h3>
                          <p className="text-xs text-slate-400 truncate mb-1">
                            {posterName}
                          </p>
                        </div>
                        <Badge className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0 border-0 flex-shrink-0">
                          {formatDate(job.saved_at)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                        <div className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{posterLocation || job.location}</span>
                        </div>
                        <span>•</span>
                        <span>{job.job_type}</span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1">
                        {job.is_tradespeople_job && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0">
                            Trade Job
                          </Badge>
                        )}
                        {formatSalary(job.salary_min, job.salary_max) && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                            {formatSalary(job.salary_min, job.salary_max)}
                          </Badge>
                        )}
                        {isHomeownerJob && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
                            Homeowner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
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
      <div className="min-h-screen bg-slate-900 pb-20 md:pb-6">
        <div className="container mx-auto p-4 md:p-6 max-w-2xl">
          <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 p-6">
            <div className="text-center">
              <BookmarkIcon className="h-12 w-12 text-red-400 mx-auto mb-3 opacity-70" />
              <h2 className="text-lg font-semibold text-white mb-2">Error Loading Saved Jobs</h2>
              <p className="text-sm text-slate-400 mb-4">
                There was an error loading your saved jobs. Please try again.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  asChild
                >
                  <Link href="/dashboard/company">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  asChild
                >
                  <Link href="/?tab=jobs_tasks&autoSearch=true">
                    <Briefcase className="h-4 w-4 mr-1.5" />
                    Browse Jobs
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
