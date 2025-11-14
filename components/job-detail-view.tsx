"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StarRating } from "@/components/star-rating"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  Building,
  Users,
  ExternalLink,
  Calendar,
  DollarSign,
  BookmarkIcon,
  ArrowLeft,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import JobApplicationForm from "./job-application-form"

interface Job {
  id: string
  title: string
  description: string
  requirements: string[]
  responsibilities: string[]
  job_type: string
  experience_level: string
  work_location: string
  location: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  benefits: string[]
  is_active: boolean
  is_tradespeople_job: boolean
  applications_count: number
  views_count: number
  created_at: string
  job_photo_url?: string
  company_profiles?: {
    id: string
    company_name: string
    description: string
    industry: string
    company_size: string
    website_url?: string
    location: string
    logo_url?: string
    user_id: string
  }
  homeowner_profiles?: {
    id: string
    user_id: string
    first_name: string
    last_name: string
    profile_photo_url?: string
  }
}

interface User {
  id: string
  email: string
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
}

interface CompanyStatus {
  isActive: boolean
}

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  is_edited: boolean
  reviewer_id: string
  reviewer_name: string
  reviewer_avatar: string | null
}

interface JobDetailViewProps {
  job: Job
  user: User | null
  userProfile: UserProfile | null
  hasApplied: boolean
  companyStatus: CompanyStatus | null
  searchParams?: { [key: string]: string | string[] | undefined }
  companyRating: {
    average_rating: number
    total_reviews: number
  }
  companyReviews: Review[]
}

export default function JobDetailView({
  job,
  user,
  userProfile,
  hasApplied,
  companyStatus,
  searchParams,
  companyRating,
  companyReviews
}: JobDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false)
  const [inquiryMessage, setInquiryMessage] = useState("")
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  // Debug: Log if job photo exists
  useEffect(() => {
    console.log("[JOB-DETAIL-VIEW] Job photo URL:", job.job_photo_url)
    console.log("[JOB-DETAIL-VIEW] Job data:", { id: job.id, title: job.title, has_photo: !!job.job_photo_url })
  }, [job.job_photo_url])

  // Helper functions to get poster details (company or homeowner)
  const getPosterName = () => {
    if (job.company_profiles) {
      return job.company_profiles.company_name
    }
    if (job.homeowner_profiles) {
      return `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}`
    }
    return "Poster"
  }

  const getPosterLogo = () => {
    if (job.company_profiles?.logo_url) {
      return job.company_profiles.logo_url
    }
    if (job.homeowner_profiles?.profile_photo_url) {
      return job.homeowner_profiles.profile_photo_url
    }
    return null
  }

  const getPosterInitials = () => {
    if (job.company_profiles) {
      return job.company_profiles.company_name.substring(0, 2).toUpperCase()
    }
    if (job.homeowner_profiles) {
      return `${job.homeowner_profiles.first_name[0]}${job.homeowner_profiles.last_name[0]}`.toUpperCase()
    }
    return "P"
  }

  const posterName = getPosterName()
  const posterLogo = getPosterLogo()
  const posterInitials = getPosterInitials()

  // Build back URL with search params - use /tasks for task jobs, /jobs for regular jobs
  const basePath = job.is_tradespeople_job ? '/tasks' : '/jobs'
  const backUrl = searchParams && Object.keys(searchParams).length > 0
    ? `${basePath}?${new URLSearchParams(searchParams as Record<string, string>).toString()}`
    : basePath
  const [isSaved, setIsSaved] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    console.log("[JOB-DETAIL-VIEW] Component loaded:", {
      jobId: job.id,
      jobTitle: job.title,
      userId: user?.id,
      userProfileId: userProfile?.id,
      hasApplied,
      companyStatus,
    })

    // Validate session on client side if user was provided from server
    if (user && !sessionValidated) {
      validateSession()
    }

    // Check if job is already saved
    if (userProfile) {
      checkIfJobSaved()
    }
  }, [job, user, userProfile, hasApplied, companyStatus])

  const validateSession = async () => {
    try {
      console.log("[JOB-DETAIL-VIEW] Validating client session...")
      const { data: { user: clientUser }, error } = await supabase.auth.getUser()

      if (error) {
        console.error("[JOB-DETAIL-VIEW] Client session validation error:", error)
        setSessionError(error.message)
      } else if (!clientUser) {
        console.warn("[JOB-DETAIL-VIEW] No client session found, but server had user")
        setSessionError("Session expired. Please refresh the page.")
      } else if (clientUser.id !== user?.id) {
        console.warn("[JOB-DETAIL-VIEW] Session mismatch:", {
          serverId: user?.id,
          clientId: clientUser.id
        })
        setSessionError("Session mismatch detected. Please refresh the page.")
      } else {
        console.log("[JOB-DETAIL-VIEW] Session validated successfully")
        setSessionValidated(true)
      }
    } catch (error) {
      console.error("[JOB-DETAIL-VIEW] Critical session validation error:", error)
      setSessionError("Unable to validate session. Please refresh the page.")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified"
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()} per hour`
    if (min) return `£${min.toLocaleString()}+ per hour`
    return `Up to £${max?.toLocaleString()} per hour`
  }

  const checkIfJobSaved = async () => {
    if (!userProfile) return

    try {
      // Detect if this is a company or professional profile
      const isCompanyProfile = !userProfile.last_name || (userProfile as any).company_name

      console.log("[JOB-DETAIL] Checking if job is saved:", {
        jobId: job.id,
        profileId: userProfile.id,
        isCompanyProfile,
      })

      const query = supabase
        .from("saved_jobs")
        .select("id")
        .eq("job_id", job.id)

      // Use the appropriate ID field
      if (isCompanyProfile) {
        query.eq("company_id", userProfile.id)
      } else {
        query.eq("professional_id", userProfile.id)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error("[JOB-DETAIL] Error checking saved status:", error)
        return
      }

      const savedStatus = !!data
      setIsSaved(savedStatus)
      console.log("[JOB-DETAIL] Job saved status:", savedStatus)
    } catch (error) {
      console.error("[JOB-DETAIL] Error checking if job is saved:", error)
    }
  }

  const handleSaveJob = async () => {
    if (!userProfile) return

    setLoading(true)
    try {
      // Detect if this is a company or professional profile
      const isCompanyProfile = !userProfile.last_name || (userProfile as any).company_name

      if (isSaved) {
        console.log("[JOB-DETAIL] Removing job from saved:", job.id)
        const deleteQuery = supabase
          .from("saved_jobs")
          .delete()
          .eq("job_id", job.id)

        // Use the appropriate ID field
        if (isCompanyProfile) {
          deleteQuery.eq("company_id", userProfile.id)
        } else {
          deleteQuery.eq("professional_id", userProfile.id)
        }

        const { error } = await deleteQuery

        if (error) throw error
        setIsSaved(false)
        console.log("[JOB-DETAIL] Job removed from saved successfully")
      } else {
        console.log("[JOB-DETAIL] Saving job:", job.id, "isCompanyProfile:", isCompanyProfile)

        const insertData: any = {
          job_id: job.id,
        }

        // Use the appropriate ID field
        if (isCompanyProfile) {
          insertData.company_id = userProfile.id
        } else {
          insertData.professional_id = userProfile.id
        }

        const { error } = await supabase.from("saved_jobs").insert(insertData)

        if (error) throw error
        setIsSaved(true)
        console.log("[JOB-DETAIL] Job saved successfully")
      }
    } catch (error) {
      console.error("[JOB-DETAIL] Error saving job:", error)
      alert("Failed to save job. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Session Error Banner */}
      {sessionError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-700 font-medium">Session Issue: {sessionError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      )}

      <div className="relative container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Search Button */}
        <div className="mb-6">
          <Button variant="outline" asChild className="hover:bg-blue-50 bg-white shadow-sm">
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to search
            </Link>
          </Button>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-3 text-gray-900 leading-tight">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                        {job.job_type}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
                        {job.work_location}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-700 hover:bg-purple-200 capitalize"
                      >
                        {job.experience_level.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Posted By Section - Top Right Corner */}
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {!job.is_active && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Inactive
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 font-medium">Posted by</span>
                      {posterLogo ? (
                        <div className="h-8 w-8 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-300 bg-gray-100">
                          <Image
                            src={posterLogo}
                            alt={posterName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-8 w-8 border border-gray-300">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            {posterInitials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm font-semibold text-gray-900">{posterName}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-6 text-sm">
                    <span className="flex items-center text-green-600 font-semibold bg-green-50 px-3 py-2 rounded-lg">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                    <span className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      Posted {formatDate(job.created_at)}
                    </span>
                    <span className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {job.applications_count} applicants
                    </span>
                  </div>
                  {userProfile && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={handleSaveJob}
                        disabled={loading}
                        className="border-blue-200 hover:bg-blue-50 bg-transparent"
                      >
                        <BookmarkIcon className={`h-4 w-4 mr-2 ${isSaved ? "fill-current text-blue-600" : ""}`} />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                    </div>
                  )}
                  {!user && (
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <Link href="/auth/sign-up">Sign Up to Apply</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">About this role</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Job Photo - if available */}
                {job.job_photo_url && (
                  <div className="mb-6">
                    <img
                      src={job.job_photo_url}
                      alt={job.title}
                      className="w-full max-h-[400px] object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        console.error("[JOB-DETAIL-VIEW] Failed to load image:", job.job_photo_url)
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={() => {
                        console.log("[JOB-DETAIL-VIEW] Image loaded successfully:", job.job_photo_url)
                      }}
                    />
                  </div>
                )}

                <div className="prose prose-gray max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">{job.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {job.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-3 mt-1 text-lg">•</span>
                        <span className="text-gray-700 leading-relaxed">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-3 mt-1 text-lg">•</span>
                        <span className="text-gray-700 leading-relaxed">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {job.skills_required && job.skills_required.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {job.skills_required.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 text-sm"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">Benefits & Perks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {job.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center">
                        <span className="text-green-500 mr-3 text-lg">✓</span>
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Application Form */}
            {userProfile && (
              <JobApplicationForm
                job={job}
                userProfile={userProfile as any}
                hasApplied={hasApplied}
                onApplicationSubmitted={() => router.refresh()}
              />
            )}

            {!user && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">Ready to Apply?</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Sign up to apply for this position and manage your privacy settings.
                  </p>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
                    <Link href="/auth/sign-up">Sign Up to Apply</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-gray-900 mb-3">
                  {posterLogo ? (
                    <div className="h-8 w-8 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-200 bg-gray-100 mr-2">
                      <Image
                        src={posterLogo}
                        alt={posterName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                  )}
                  About {posterName}
                </CardTitle>
                {/* Poster Rating */}
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                  onClick={() => setShowReviewsModal(true)}
                  title="Click to view reviews"
                >
                  <StarRating
                    rating={companyRating.average_rating}
                    totalReviews={companyRating.total_reviews}
                    size="md"
                    showCount={true}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {job.company_profiles?.description && (
                  <p className="text-gray-700 leading-relaxed">{job.company_profiles.description}</p>
                )}

                <div className="space-y-4">
                  {job.company_profiles && (
                    <>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Industry</span>
                        <span className="text-gray-900 font-semibold">{job.company_profiles.industry}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Company Size</span>
                        <span className="text-gray-900 font-semibold">{job.company_profiles.company_size}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600 font-medium">Location</span>
                        <span className="text-gray-900 font-semibold">{job.company_profiles.location}</span>
                      </div>
                    </>
                  )}
                  {job.homeowner_profiles && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 font-medium">Posted by</span>
                      <span className="text-gray-900 font-semibold">Homeowner</span>
                    </div>
                  )}
                </div>

                {job.company_profiles?.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full border-blue-200 hover:bg-blue-50 text-blue-600 bg-transparent"
                  >
                    <a href={job.company_profiles.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <Dialog open={showReviewsModal} onOpenChange={setShowReviewsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Company Reviews
            </DialogTitle>
            <DialogDescription>
              View all reviews and ratings for this company
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rating Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {companyRating.average_rating > 0 ? companyRating.average_rating.toFixed(1) : "0.0"}
                  </div>
                  <div className="text-sm text-gray-600">out of 5</div>
                </div>
                <div className="flex-1">
                  <StarRating
                    rating={companyRating.average_rating}
                    totalReviews={companyRating.total_reviews}
                    size="lg"
                    showCount={false}
                  />
                  <div className="text-sm text-gray-600 mt-1">
                    Based on {companyRating.total_reviews} review{companyRating.total_reviews !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {companyReviews.length > 0 ? (
              <div className="space-y-4">
                {companyReviews.map((review) => {
                  return (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {review.reviewer_avatar ? (
                            <div className="h-8 w-8 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                              <Image
                                src={review.reviewer_avatar}
                                alt={review.reviewer_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {review.reviewer_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className="font-semibold text-sm">{review.reviewer_name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                              {review.is_edited && " (edited)"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-gray-700 mt-2">{review.review_text}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet for this company.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
