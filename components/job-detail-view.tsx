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
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"
import JobApplicationForm from "./job-application-form"
import { useTranslation } from "@/lib/i18n/context"
import { formatDisplayAddress } from "@/lib/utils"

interface Job {
  id: string
  title: string
  description: string
  work_location: string
  location: string
  budget_min?: number
  budget_max?: number
  skills_required: string[]
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
  const pathname = usePathname()
  const supabase = createClient()
  const { t } = useTranslation()

  // Locale-aware sign-in URL (users viewing jobs likely already have accounts)
  const isOnBrRoute = pathname?.startsWith('/br')
  const signInUrl = isOnBrRoute
    ? `/auth/login?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : `/auth/login?returnUrl=${encodeURIComponent(pathname || '/')}`

  const [loading, setLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false)
  const [inquiryMessage, setInquiryMessage] = useState("")
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [blockedReason, setBlockedReason] = useState<'own_job' | 'wrong_type' | null>(null)
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [applicationSubmitted, setApplicationSubmitted] = useState(hasApplied)

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

  // Get poster profile URL
  const getPosterProfileUrl = () => {
    if (job.company_profiles) {
      return `/companies/${job.company_profiles.id}`
    }
    // Homeowner public profile pages are not a route — no link
    return null
  }

  const posterProfileUrl = getPosterProfileUrl()

  // Build back URL with search params - redirect to main page with modal open
  const tabParam = job.is_tradespeople_job ? 'jobs_tasks' : 'vacancies'
  console.log("[JOB-DETAIL-VIEW] Building back URL with searchParams:", searchParams)
  const backUrl = searchParams && Object.keys(searchParams).length > 0
    ? `/?tab=${tabParam}&${new URLSearchParams(searchParams as Record<string, string>).toString()}`
    : `/?tab=${tabParam}`
  console.log("[JOB-DETAIL-VIEW] Back URL:", backUrl)
  const [isSaved, setIsSaved] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Track job view on mount
  useEffect(() => {
    const trackJobView = async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}/views`, {
          method: 'POST',
        })
        if (response.ok) {
          const data = await response.json()
          console.log("[JOB-DETAIL-VIEW] View tracked:", data)
        }
      } catch (error) {
        // Silently fail - view tracking is not critical
        console.error("[JOB-DETAIL-VIEW] Error tracking view:", error)
      }
    }

    trackJobView()
  }, [job.id])

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

    // Fetch user type to check apply restrictions
    if (user) {
      fetchUserType()
    }

    // Auto-open application modal if apply=true in URL
    if (searchParams?.apply === 'true' && userProfile && !hasApplied) {
      handleApplyClick()
    }
  }, [job, user, userProfile, hasApplied, companyStatus, searchParams])

  const fetchUserType = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user?.id)
        .single()

      if (!error && data) {
        setUserType(data.user_type)
      }
    } catch (error) {
      console.error("[JOB-DETAIL-VIEW] Error fetching user type:", error)
    }
  }

  const handleApplyClick = () => {
    // Check if user is trying to apply to their own job
    if (user) {
      const isOwnJob = job.company_profiles?.user_id === user.id ||
                       job.homeowner_profiles?.user_id === user.id

      if (isOwnJob) {
        setBlockedReason('own_job')
        setShowBlockedModal(true)
        return
      }
    }

    // Check if this is a trade job and user type
    if (job.is_tradespeople_job) {
      // Only contractors and companies can apply to trade jobs
      if (userType === 'professional' || userType === 'homeowner') {
        setBlockedReason('wrong_type')
        setShowBlockedModal(true)
        return
      }
    } else {
      // Regular jobs (vacancies) - only professionals can apply
      if (userType === 'company' || userType === 'contractor') {
        setBlockedReason('wrong_type')
        setShowBlockedModal(true)
        return
      }
    }

    // Check if user has a profile set up
    if (!userProfile) {
      setShowProfileRequiredModal(true)
      return
    }

    setShowApplicationModal(true)
  }

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
    const rateType = job.is_tradespeople_job ? "per job" : "per hour"
    if (!min && !max) return "Wages not specified"
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()} ${rateType}`
    if (min) return `£${min.toLocaleString()}+ ${rateType}`
    return `Up to £${max?.toLocaleString()} ${rateType}`
  }

  const checkIfJobSaved = async () => {
    if (!userProfile || !user) return

    try {
      // Detect profile type: contractor, company, or professional
      const isContractorProfile = (userProfile as any).is_contractor || (userProfile as any).business_name
      const isCompanyProfile = !isContractorProfile && (!userProfile.last_name || (userProfile as any).company_name)
      const isProfessionalProfile = !isContractorProfile && !isCompanyProfile

      console.log("[JOB-DETAIL] Checking if job is saved:", {
        jobId: job.id,
        profileId: userProfile.id,
        userId: user.id,
        isContractorProfile,
        isCompanyProfile,
        isProfessionalProfile,
      })

      // For contractors and companies, use user_id; for professionals, use professional_id
      const query = supabase
        .from("saved_jobs")
        .select("id")
        .eq("job_id", job.id)

      if (isProfessionalProfile) {
        query.eq("professional_id", userProfile.id)
      } else {
        // Companies and contractors use user_id
        query.eq("user_id", user.id)
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
    if (!userProfile || !user) return

    setLoading(true)
    try {
      // Detect profile type: contractor, company, or professional
      const isContractorProfile = (userProfile as any).is_contractor || (userProfile as any).business_name
      const isCompanyProfile = !isContractorProfile && (!userProfile.last_name || (userProfile as any).company_name)
      const isProfessionalProfile = !isContractorProfile && !isCompanyProfile

      if (isSaved) {
        console.log("[JOB-DETAIL] Removing job from saved:", job.id)
        const deleteQuery = supabase
          .from("saved_jobs")
          .delete()
          .eq("job_id", job.id)

        if (isProfessionalProfile) {
          deleteQuery.eq("professional_id", userProfile.id)
        } else {
          // Companies and contractors use user_id
          deleteQuery.eq("user_id", user.id)
        }

        const { error } = await deleteQuery

        if (error) throw error
        setIsSaved(false)
        console.log("[JOB-DETAIL] Job removed from saved successfully")
      } else {
        console.log("[JOB-DETAIL] Saving job:", job.id, "isProfessionalProfile:", isProfessionalProfile)

        const insertData: any = {
          job_id: job.id,
        }

        if (isProfessionalProfile) {
          insertData.professional_id = userProfile.id
        } else {
          // Companies and contractors use user_id
          insertData.user_id = user.id
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
    <div className="min-h-screen bg-slate-900">
      {/* Session Error Banner */}
      {sessionError && (
        <div className="bg-red-900/30 border-b border-red-500/30 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-sm text-red-400 font-medium">Session Issue: {sessionError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="border border-red-500/30 text-red-400 hover:bg-red-900/30"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      )}

      <div className="relative container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <div className="mb-5">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => {
              if (searchParams && Object.keys(searchParams).length > 0) {
                router.push(backUrl)
              } else {
                router.back()
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Expired / Inactive job notice */}
        {!job.is_active && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <span className="mt-0.5 text-red-400 text-lg leading-none">⚠</span>
            <div>
              <p className="text-sm font-semibold text-red-400">This job is no longer available</p>
              <p className="text-xs text-slate-400 mt-0.5">
                The posting has been closed or expired. You can browse similar jobs below.
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="ml-auto shrink-0 text-slate-400 hover:text-white hover:bg-white/10 border border-white/15">
              <Link href={`/?tab=${job.is_tradespeople_job ? 'jobs_tasks' : 'vacancies'}`}>Browse jobs</Link>
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job Header */}
            <Card className="border border-white/10 bg-slate-800/60 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 w-full">
                    {/* Poster row */}
                    <div className="flex items-center gap-3 mb-4">
                      {posterProfileUrl ? (
                        <Link
                          href={posterProfileUrl}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                        >
                          {posterLogo ? (
                            <div className="h-9 w-9 flex-shrink-0 relative rounded-full overflow-hidden border border-white/20 bg-slate-700 group-hover:border-emerald-500/50 transition-colors">
                              <Image src={posterLogo} alt={posterName} fill className="object-cover" />
                            </div>
                          ) : (
                            <Avatar className="h-9 w-9 border border-white/20 group-hover:border-emerald-500/50 transition-colors">
                              <AvatarFallback className="text-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                                {posterInitials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{posterName}</span>
                            <div
                              className="mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReviewsModal(true) }}
                              title="Click to view reviews"
                            >
                              <StarRating rating={companyRating.average_rating} totalReviews={companyRating.total_reviews} size="sm" showCount={true} />
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          {posterLogo ? (
                            <div className="h-9 w-9 flex-shrink-0 relative rounded-full overflow-hidden border border-white/20 bg-slate-700">
                              <Image src={posterLogo} alt={posterName} fill className="object-cover" />
                            </div>
                          ) : (
                            <Avatar className="h-9 w-9 border border-white/20">
                              <AvatarFallback className="text-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                                {posterInitials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-white">{posterName}</span>
                            <div
                              className="mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReviewsModal(true) }}
                              title="Click to view reviews"
                            >
                              <StarRating rating={companyRating.average_rating} totalReviews={companyRating.total_reviews} size="sm" showCount={true} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Job Title */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h1 className="text-2xl font-bold text-white leading-tight">{job.title}</h1>
                      {job.is_tradespeople_job ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs">
                          {t('jobs.tradeJob')}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                          {t('jobs.vacancy')}
                        </Badge>
                      )}
                      {!job.is_active && (
                        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex items-center text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {formatDisplayAddress(job.location)}
                      </span>
                      <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-0 text-xs">
                        {job.work_location}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center text-emerald-400 font-semibold">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatSalary(job.budget_min, job.budget_max)}
                    </span>
                    <span className="flex items-center text-slate-500 text-xs">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Posted {formatDate(job.created_at)}
                    </span>
                    <span className="flex items-center text-slate-500 text-xs">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {job.applications_count} applicants
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {userProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveJob}
                        disabled={loading}
                        className="border border-white/15 hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <BookmarkIcon className={`h-4 w-4 mr-1.5 ${isSaved ? "fill-current text-emerald-400" : ""}`} />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                    )}
                    {!user && (
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link href={signInUrl}>Sign In to Apply</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card className="border border-white/10 bg-slate-800/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">
                  {job.is_tradespeople_job ? "About this job" : "About this role"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.job_photo_url && (
                  <div className="mb-4">
                    <img
                      src={job.job_photo_url}
                      alt={job.title}
                      className="w-full max-h-[360px] object-cover rounded-lg"
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
                <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-sm">{job.description}</p>
              </CardContent>
            </Card>


            {/* Skills */}
            {job.skills_required && job.skills_required.length > 0 && (
              <Card className="border border-white/10 bg-slate-800/60 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15 text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Apply CTA */}
            {user && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-none">
                <CardContent className="p-6 text-center">
                  <h3 className="text-base font-semibold mb-2 text-white">
                    {applicationSubmitted ? "Application Submitted" : "Ready to Apply?"}
                  </h3>
                  <p className="text-slate-400 mb-5 text-sm leading-relaxed">
                    {applicationSubmitted
                      ? "You have already applied to this position. Check your applications to see the status."
                      : "Review what information will be shared and submit your application."}
                  </p>
                  <Button
                    onClick={() => !applicationSubmitted && handleApplyClick()}
                    className={applicationSubmitted
                      ? "bg-slate-700 text-slate-300 px-8 cursor-not-allowed opacity-80"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                    }
                    disabled={applicationSubmitted}
                  >
                    {applicationSubmitted ? "Applied" : "Apply Now"}
                  </Button>
                  {applicationSubmitted && (
                    <Button asChild variant="ghost" className="px-8 mt-3 text-slate-400 hover:text-white hover:bg-white/10">
                      <Link href="/dashboard/professional/applications">View Applications</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="border border-white/10 bg-slate-800/60 shadow-none">
                <CardContent className="p-6 text-center">
                  <h3 className="text-base font-semibold mb-2 text-white">Ready to Apply?</h3>
                  <p className="text-slate-400 mb-5 text-sm leading-relaxed">
                    Sign up to apply for this position and manage your privacy settings.
                  </p>
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                    <Link href={signInUrl}>Sign In to Apply</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border border-white/10 bg-slate-800/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base text-white mb-2">
                  {posterLogo ? (
                    <div className="h-7 w-7 flex-shrink-0 relative rounded-full overflow-hidden border border-white/20 bg-slate-700 mr-2">
                      <Image src={posterLogo} alt={posterName} fill className="object-cover" />
                    </div>
                  ) : (
                    <Building className="h-4 w-4 mr-2 text-emerald-400" />
                  )}
                  About {posterName}
                </CardTitle>
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                  onClick={() => setShowReviewsModal(true)}
                  title="Click to view reviews"
                >
                  <StarRating rating={companyRating.average_rating} totalReviews={companyRating.total_reviews} size="sm" showCount={true} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.company_profiles?.description && (
                  <p className="text-slate-400 leading-relaxed text-sm">{job.company_profiles.description}</p>
                )}

                <div className="space-y-0 divide-y divide-white/10">
                  {job.company_profiles && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-slate-500 text-xs">Industry</span>
                        <span className="text-slate-300 text-xs font-medium">{job.company_profiles.industry}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-slate-500 text-xs">Company Size</span>
                        <span className="text-slate-300 text-xs font-medium">{job.company_profiles.company_size}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-slate-500 text-xs">Location</span>
                        <span className="text-slate-300 text-xs font-medium">{formatDisplayAddress(job.company_profiles.location)}</span>
                      </div>
                    </>
                  )}
                  {job.homeowner_profiles && (
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-500 text-xs">Posted by</span>
                      <span className="text-slate-300 text-xs font-medium">Homeowner</span>
                    </div>
                  )}
                </div>

                {job.company_profiles?.website_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-full border border-white/15 hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <a href={job.company_profiles.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Company Reviews</DialogTitle>
            <DialogDescription className="text-slate-400">
              View all reviews and ratings for this company
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">
                    {companyRating.average_rating > 0 ? companyRating.average_rating.toFixed(1) : "0.0"}
                  </div>
                  <div className="text-xs text-slate-500">out of 5</div>
                </div>
                <div className="flex-1">
                  <StarRating rating={companyRating.average_rating} totalReviews={companyRating.total_reviews} size="lg" showCount={false} />
                  <div className="text-xs text-slate-500 mt-1">
                    Based on {companyRating.total_reviews} review{companyRating.total_reviews !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            {companyReviews.length > 0 ? (
              <div className="space-y-3">
                {companyReviews.map((review) => (
                  <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {review.reviewer_avatar ? (
                          <div className="h-8 w-8 flex-shrink-0 relative rounded-full overflow-hidden border border-white/20 bg-slate-700">
                            <Image src={review.reviewer_avatar} alt={review.reviewer_name} fill className="object-cover" />
                          </div>
                        ) : (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                              {review.reviewer_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div className="font-semibold text-sm text-white">{review.reviewer_name}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(review.created_at).toLocaleDateString()}
                            {review.is_edited && " (edited)"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-slate-400 mt-2">{review.review_text}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No reviews yet for this company.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Modal */}
      {userProfile && (
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Apply for {job.title}</DialogTitle>
              <DialogDescription>
                Review what information will be shared with the employer and submit your application.
              </DialogDescription>
            </DialogHeader>
            <JobApplicationForm
              job={job}
              userProfile={userProfile as any}
              hasApplied={applicationSubmitted}
              onApplicationSubmitted={() => {
                setShowApplicationModal(false)
                setApplicationSubmitted(true)
                router.refresh()
              }}
              onClose={() => setShowApplicationModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Required Modal */}
      <Dialog open={showProfileRequiredModal} onOpenChange={setShowProfileRequiredModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-500">Complete Your Profile</DialogTitle>
            <DialogDescription>
              You need to complete your profile before applying for jobs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To apply for this {job.is_tradespeople_job ? "job" : "vacancy"}, please complete your profile setup first.
              This ensures employers can review your qualifications and contact you.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-amber-400 mb-2 text-sm">What you need to do:</h4>
              <ul className="text-sm text-amber-300/80 space-y-1">
                <li>• Fill in your basic information</li>
                <li>• Add your skills and experience</li>
                <li>• Upload a CV (optional but recommended)</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowProfileRequiredModal(false)}>Cancel</Button>
            <Button asChild className="bg-amber-600 hover:bg-amber-700">
              <Link href="/onboarding">Complete Profile</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Application Modal */}
      <Dialog open={showBlockedModal} onOpenChange={setShowBlockedModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">
              {blockedReason === 'own_job'
                ? "Cannot Apply to Your Own Job"
                : job.is_tradespeople_job ? t('jobs.blockedModalTitle') : "Cannot Apply for This Job"}
            </DialogTitle>
            <DialogDescription>
              {blockedReason === 'own_job'
                ? "You cannot apply to jobs or vacancies that you have posted."
                : job.is_tradespeople_job
                  ? t('jobs.blockedModalDescription')
                  : "This job type is not available for your account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {blockedReason === 'own_job' ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This is your own job posting. You can manage it from your dashboard, but you cannot submit an application to it.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-1 text-sm">Manage This Job</h4>
                  <p className="text-sm text-slate-400 mb-3">View applications, edit details, or manage this job from your dashboard.</p>
                  <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Link href={job.is_tradespeople_job ? "/dashboard/homeowner/jobs" : "/dashboard/company/jobs"}>
                      Go to Dashboard
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {job.is_tradespeople_job ? (
                    <>{t('jobs.blockedModalExplanation')} <strong>{t('jobs.blockedModalVacanciesLink')}</strong> {t('jobs.blockedModalSectionInstead')}</>
                  ) : (
                    <>Vacancy jobs are employment positions for individual jobseekers. As a business account, you can browse the <strong>Jobs/Tasks</strong> section to find work opportunities, or post jobs to hire professionals.</>
                  )}
                </p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-1 text-sm">
                    {job.is_tradespeople_job ? t('jobs.blockedModalWantToApply') : "Looking for work?"}
                  </h4>
                  <p className="text-sm text-slate-400 mb-3">
                    {job.is_tradespeople_job
                      ? t('jobs.blockedModalAccountRequired')
                      : "Browse the Jobs/Tasks section to find opportunities suitable for your business."}
                  </p>
                  <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Link href={job.is_tradespeople_job ? "/auth/sign-up" : "/?tab=jobs_tasks"}>
                      {job.is_tradespeople_job ? t('jobs.blockedModalCreateAccount') : "Browse Jobs/Tasks"}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBlockedModal(false)}>
              {t('common.close')}
            </Button>
            {blockedReason !== 'own_job' && (
              <Button asChild variant="default">
                <Link href={job.is_tradespeople_job ? "/?tab=vacancies" : "/?tab=jobs_tasks"}>
                  {job.is_tradespeople_job ? t('jobs.blockedModalBrowseVacancies') : "Browse Jobs/Tasks"}
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
