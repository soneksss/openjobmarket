import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
} from "lucide-react"
import { HomeownerJobActions } from "@/components/homeowner-job-actions"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function HomeownerJobDetailsPage({ params }: PageProps) {
  const { id } = await params
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

  // Get job details
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
      homeowner_id,
      job_photo_url
    `)
    .eq("id", id)
    .eq("homeowner_id", profile.id)
    .single()

  if (jobError || !job) {
    console.error("[HOMEOWNER-JOB-DETAILS] Error fetching job:", jobError)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
        <Link href="/dashboard/homeowner">
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

        {/* Applications Section */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Applications ({applications?.length || 0})
            </h2>
          </CardHeader>
          <CardContent>
            {!applications || applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                <p className="text-sm">
                  When contractors or professionals apply for this job, their applications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application: any) => {
                  // Determine if this is a contractor or professional application
                  const isContractor = !!application.contractor_profiles
                  const profile = isContractor
                    ? application.contractor_profiles
                    : application.professional_profiles

                  if (!profile) return null

                  const applicantName = isContractor
                    ? profile.business_name
                    : `${profile.first_name} ${profile.last_name}`

                  const applicantTitle = isContractor ? profile.trade_specialties?.[0] : profile.title

                  const applicantPhoto = isContractor ? profile.profile_picture : profile.profile_photo_url

                  return (
                    <div
                      key={application.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={applicantPhoto} alt={applicantName} />
                          <AvatarFallback>
                            {applicantName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{applicantName}</h4>
                            <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                            {isContractor && <Badge variant="outline">Contractor</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{applicantTitle || "Professional"}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2 flex-wrap">
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {profile.location || "Location not specified"}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Applied {formatDate(application.applied_at)}
                            </span>
                            {isContractor && profile.experience_years && (
                              <span className="flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {profile.experience_years} years experience
                              </span>
                            )}
                            {!isContractor && profile.experience_level && (
                              <span className="flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {profile.experience_level}
                              </span>
                            )}
                          </div>

                          {/* Skills/Specialties */}
                          {isContractor && profile.trade_specialties && profile.trade_specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.trade_specialties.slice(0, 5).map((specialty: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                              {profile.trade_specialties.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{profile.trade_specialties.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                          {!isContractor && profile.skills && profile.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.skills.slice(0, 5).map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {profile.skills.length > 5 && (
                                <span className="text-xs text-gray-500">+{profile.skills.length - 5} more</span>
                              )}
                            </div>
                          )}

                          {/* Cover Letter */}
                          {application.cover_letter && (
                            <div className="mt-3 p-3 bg-gray-100 rounded-md">
                              <p className="text-sm font-medium mb-1">Cover Letter:</p>
                              <p className="text-sm text-gray-700 line-clamp-3">{application.cover_letter}</p>
                            </div>
                          )}

                          {/* Bio for contractors */}
                          {isContractor && profile.bio && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700 line-clamp-2">{profile.bio}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 ml-4">
                        {isContractor ? (
                          <Button size="sm" asChild>
                            <Link href={`/contractors/${profile.id}`}>
                              <User className="h-4 w-4 mr-1" />
                              View Profile
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" asChild>
                            <Link href={`/professionals/${profile.id}`}>
                              <User className="h-4 w-4 mr-1" />
                              View Profile
                            </Link>
                          </Button>
                        )}

                        {/* Contact info for contractors */}
                        {isContractor && profile.email && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`mailto:${profile.email}`}>
                              <Mail className="h-4 w-4 mr-1" />
                              Email
                            </a>
                          </Button>
                        )}
                        {isContractor && profile.phone && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`tel:${profile.phone}`}>
                              <Phone className="h-4 w-4 mr-1" />
                              Call
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
