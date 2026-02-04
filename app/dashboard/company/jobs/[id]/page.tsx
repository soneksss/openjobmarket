// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react"
import { HomeownerJobActions } from "@/components/homeowner-job-actions"
import { HomeownerJobDetailsContent } from "@/components/homeowner-job-details-content"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CompanyJobDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
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

  // Get job details - check both company_id and homeowner_id for flexibility
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      short_description,
      location,
      latitude,
      longitude,
      salary_min,
      salary_max,
      salary_frequency,
      is_active,
      expires_at,
      created_at,
      updated_at,
      is_tradespeople_job,
      work_location,
      job_type,
      company_id,
      job_photo_url,
      accepted_contractor_id,
      completed_at,
      completion_status
    `)
    .eq("id", id)
    .eq("company_id", profile.id)
    .single()

  if (jobError || !job) {
    console.error("[COMPANY-JOB-DETAILS] Error fetching job:", jobError)
    notFound()
  }

  // Get applications for this job (support both contractors and professionals)
  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      id,
      status,
      applied_at,
      cover_letter,
      contractor_id,
      professional_id,
      contractor_profiles (
        id,
        user_id,
        business_name,
        trade_specialties,
        experience_years,
        location,
        profile_picture,
        phone,
        email,
        bio
      ),
      professional_profiles (
        id,
        user_id,
        first_name,
        last_name,
        title,
        location,
        skills,
        experience_level,
        profile_photo_url,
        portfolio_url,
        linkedin_url,
        github_url
      )
    `)
    .eq("job_id", id)
    .order("applied_at", { ascending: false })

  // Calculate status
  const now = new Date()
  const expiresAt = job.expires_at ? new Date(job.expires_at) : null
  const isExpired = expiresAt && expiresAt < now
  const isActive = job.is_active && !isExpired

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const date = new Date(expiresAt)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const expiryText = formatExpiryDate(job.expires_at)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Link href="/dashboard/company">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Job Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{job.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {isActive ? "Active" : "Expired"}
                  </Badge>
                  {job.is_tradespeople_job && (
                    <Badge className="bg-purple-100 text-purple-800">Tradespeople Job</Badge>
                  )}
                  {job.work_location && (
                    <Badge variant="outline">
                      {job.work_location.charAt(0).toUpperCase() + job.work_location.slice(1)}
                    </Badge>
                  )}
                  {job.job_type && (
                    <Badge variant="outline">
                      {job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-gray-900">{job.location}</p>
                </div>
              </div>

              {/* Salary */}
              {job.salary_min && job.salary_max && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Budget</p>
                    <p className="text-gray-900">
                      £{job.salary_min} - £{job.salary_max}
                      {job.salary_frequency && ` ${job.salary_frequency.replace("_", " ")}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Posted Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Posted</p>
                  <p className="text-gray-900">{formatDate(job.created_at)}</p>
                </div>
              </div>

              {/* Expiry Date */}
              {expiryText && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className={`font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>{expiryText}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Management Actions */}
            <div className="pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Manage Job</h3>
              <HomeownerJobActions
                jobId={job.id}
                jobTitle={job.title}
                isActive={isActive}
                expiresAt={job.expires_at}
                currentJob={{
                  title: job.title,
                  description: job.description,
                  short_description: job.short_description,
                  location: job.location,
                  latitude: job.latitude,
                  longitude: job.longitude,
                  salary_min: job.salary_min,
                  salary_max: job.salary_max,
                  salary_frequency: job.salary_frequency,
                  work_location: job.work_location,
                  job_type: job.job_type,
                  job_photo_url: job.job_photo_url,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Job Description</h2>
          </CardHeader>
          <CardContent>
            {/* Job Photo - if available */}
            {job.job_photo_url && (
              <div className="mb-6">
                <img
                  src={job.job_photo_url}
                  alt={job.title}
                  className="w-full max-h-[400px] object-cover rounded-lg shadow-md"
                />
              </div>
            )}

            {job.short_description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
                <p className="text-gray-900">{job.short_description}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Full Description</h3>
              <div className="prose max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Section with Accept/Complete functionality */}
        <HomeownerJobDetailsContent job={job} applications={applications || []} homeownerUserId={user.id} />

        {/* Expiry Warning */}
        {!isActive && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-900 mb-1">This job has expired</h3>
                  <p className="text-sm text-red-700">
                    This job posting is no longer active and is not visible to professionals. Use the "Extend" button
                    above to reactivate it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
