"use client"

import { useState, useEffect, forwardRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StarRating } from "@/components/star-rating"
import { MapPin, Building, Clock, Users, Briefcase, Heart, ExternalLink, ChevronDown, ChevronUp, MessageCircle, User as UserIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import JobApplicationForm from "@/components/job-application-form"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"

interface Job {
  id: string
  title: string
  description: string
  short_description?: string
  long_description?: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  full_address?: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  job_photo_url?: string
  company_profiles?: {
    id: string
    company_name: string
    location: string
    industry: string
    logo_url?: string
    user_id: string
  } | null
  homeowner_profiles?: {
    id: string
    user_id: string
    first_name: string
    last_name: string
    profile_photo_url?: string
  } | null
  poster_type?: 'company' | 'individual'
  poster_first_name?: string
  poster_last_name?: string
  poster_logo_url?: string
  average_rating?: number
  total_reviews?: number
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
}

interface JobCardProps {
  job: Job
  isLoggedIn: boolean
  isSelected?: boolean
  onSelect?: () => void
  onApply?: (jobId: string) => void
  userProfile?: UserProfile | null
}

const JobCard = forwardRef<HTMLDivElement, JobCardProps>(({ job, isLoggedIn, isSelected = false, onSelect, onApply, userProfile }, ref) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSignUpDialog, setShowSignUpDialog] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)

  // Locale-aware auth URLs
  const isOnBrRoute = pathname?.startsWith('/br')
  const signUpUrl = isOnBrRoute ? '/br/auth/sign-up' : '/auth/sign-up'
  const loginUrl = isOnBrRoute ? '/br/auth/login' : '/auth/login'

  // Auto-expand when selected from map pin click or card click
  // Auto-collapse when deselected (another job is selected)
  useEffect(() => {
    setIsExpanded(isSelected)
  }, [isSelected])

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

  const formatAddress = (fullAddress?: string) => {
    if (!fullAddress) return null

    // Extract street name (first part before comma)
    const parts = fullAddress.split(',').map(p => p.trim())
    const street = parts[0]

    // Extract UK postcode using regex (e.g., PO9 3AT, SW1A 1AA, etc.)
    const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i
    const postcodeMatch = fullAddress.match(postcodeRegex)
    const postcode = postcodeMatch ? postcodeMatch[0] : null

    // Return simplified format: "Street, Postcode"
    if (street && postcode) {
      return `${street}, ${postcode}`
    }

    // Fallback to just street if no postcode found
    return street || fullAddress
  }

  const salary = formatSalary(job.salary_min, job.salary_max)
  const topSkills = job.skills_required?.slice(0, 3) || []

  // Determine poster information
  const posterName =
    (job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
    job.company_profiles?.company_name ||
    "Anonymous"

  const companyName = job.company_profiles?.company_name
  const logoUrl = job.poster_logo_url || job.company_profiles?.logo_url

  // Get company profile URL
  const companyProfileUrl = job.company_profiles?.id
    ? `/companies/${job.company_profiles.id}`
    : null

  // Use short_description if available, otherwise use description
  const shortDesc = job.short_description || job.description
  const longDesc = job.long_description || job.description

  // Format address for display
  const displayAddress = formatAddress(job.full_address || job.location)

  const handleContactClick = () => {
    if (!isLoggedIn) {
      setShowSignUpDialog(true)
    } else {
      // Get the job poster's user ID (company or homeowner)
      const recipientId = job.company_profiles?.user_id || job.homeowner_profiles?.user_id

      if (recipientId) {
        // Capture current URL to allow returning to search results
        const currentUrl = window.location.pathname + window.location.search
        const returnUrl = encodeURIComponent(currentUrl)

        // Navigate to new message page with recipient ID, job context, and return URL
        window.location.href = `/messages/new?recipient=${recipientId}&subject=Regarding: ${encodeURIComponent(job.title)}&returnUrl=${returnUrl}`
      } else {
        console.error("[JOB-CARD] No recipient ID found for job:", job.id)
        alert("Unable to contact job poster. Please try again later.")
      }
    }
  }

  // Check if user has already applied
  useEffect(() => {
    const checkApplication = async () => {
      if (!userProfile) return

      const supabase = createClient()
      const { data } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", job.id)
        .eq("professional_id", userProfile.id)
        .maybeSingle()

      setHasApplied(!!data)
    }

    checkApplication()
  }, [userProfile, job.id])

  const handleApplyClick = () => {
    if (!isLoggedIn || !userProfile) {
      setShowSignUpDialog(true)
    } else if (!hasApplied) {
      // Open application modal directly
      setShowApplicationModal(true)
    }
  }

  return (
    <>
      <Card
        ref={ref}
        className={`group hover:shadow-lg transition-shadow duration-200 border cursor-pointer ${
          isSelected
            ? "shadow-xl border-2 border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => {
          // Let the parent handle selection, which will update isSelected
          // The useEffect will then update isExpanded based on isSelected
          onSelect?.()
        }}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Job Details */}
            <div className="flex-1 min-w-0">
              {/* Poster Info - Only show when expanded */}
              {isExpanded && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  {(logoUrl || posterName) && (
                    <>
                      {companyProfileUrl ? (
                        <Link
                          href={companyProfileUrl}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {logoUrl ? (
                            <div className="h-11 w-11 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-300 bg-gray-100">
                              <Image
                                src={logoUrl}
                                alt={posterName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <Avatar className="h-11 w-11 border border-gray-300">
                              <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                {posterName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">{posterName}</p>
                            {(job.average_rating !== undefined && job.total_reviews !== undefined) && (
                              <div className="mt-0.5">
                                <StarRating
                                  rating={job.average_rating}
                                  totalReviews={job.total_reviews}
                                  size="sm"
                                  showCount={true}
                                />
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <>
                          {logoUrl ? (
                            <div className="h-11 w-11 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-300 bg-gray-100">
                              <Image
                                src={logoUrl}
                                alt={posterName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <Avatar className="h-11 w-11 border border-gray-300">
                              <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                {posterName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">{posterName}</p>
                            {(job.average_rating !== undefined && job.total_reviews !== undefined) && (
                              <div className="mt-0.5">
                                <StarRating
                                  rating={job.average_rating}
                                  totalReviews={job.total_reviews}
                                  size="sm"
                                  showCount={true}
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Job Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {job.title}
              </h3>

              {/* Company Name with Stars - Show in collapsed view */}
              {!isExpanded && companyName && (
                <div className="mb-2">
                  {companyProfileUrl ? (
                    <Link
                      href={companyProfileUrl}
                      className="inline-flex items-start gap-2 hover:opacity-80 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">{companyName}</span>
                      {(job.average_rating !== undefined && job.total_reviews !== undefined) && (
                        <div className="flex-shrink-0">
                          <StarRating
                            rating={job.average_rating}
                            totalReviews={job.total_reviews}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-700">{companyName}</span>
                      {(job.average_rating !== undefined && job.total_reviews !== undefined) && (
                        <div className="flex-shrink-0">
                          <StarRating
                            rating={job.average_rating}
                            totalReviews={job.total_reviews}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Short Description */}
              <p className={`text-sm text-gray-600 mb-2 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {isExpanded ? longDesc : (shortDesc?.substring(0, 120) + (shortDesc && shortDesc.length > 120 ? "..." : ""))}
              </p>

              {/* Price */}
              {salary && (
                <div className="text-sm font-bold text-green-600 mb-2">
                  {salary} <span className="text-gray-500 font-normal">(per job)</span>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Job Photo */}
                  {job.job_photo_url && (
                    <div className="mb-3">
                      <img
                        src={job.job_photo_url}
                        alt={job.title}
                        className="w-full max-h-[250px] object-cover rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowFullscreenImage(true)
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  {/* Location */}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{displayAddress}</span>
                  </div>

                  {/* Job Type Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {job.job_type}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                      {job.work_location}
                    </Badge>
                  </div>

                  {/* Skills */}
                  {topSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-green-50 border-green-200 text-green-700"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {job.skills_required?.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{job.skills_required.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{job.applications_count} applications</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:bg-gray-50 px-2 py-1 h-auto text-xs sm:text-sm"
                      disabled={!isLoggedIn}
                      onClick={(e) => {
                        e.stopPropagation()
                        !isLoggedIn && setShowSignUpDialog(true)
                      }}
                    >
                      <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Save</span>
                      <span className="sm:hidden">Save</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:bg-gray-50 px-2 py-1 h-auto text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContactClick()
                      }}
                    >
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Contact</span>
                      <span className="sm:hidden">Contact</span>
                    </Button>

                    <Button
                      className={hasApplied
                        ? "bg-green-600 text-white px-2 py-1 h-auto text-xs sm:text-sm flex-1 sm:flex-initial cursor-not-allowed opacity-90"
                        : "bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 h-auto text-xs sm:text-sm flex-1 sm:flex-initial"
                      }
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!hasApplied) {
                          handleApplyClick()
                        }
                      }}
                      disabled={hasApplied}
                    >
                      <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span>{hasApplied ? "Applied" : "Apply Now"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Up Dialog */}
      <Dialog open={showSignUpDialog} onOpenChange={setShowSignUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Sign Up Required</DialogTitle>
            <DialogDescription className="text-center text-lg pt-4">
              Sign up to send messages or view profiles
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href={signUpUrl}>
                Create Account
              </Link>
            </Button>
            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href={loginUrl} className="text-blue-600 hover:text-blue-800 font-medium">
                Log in
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Modal */}
      {userProfile && (
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Apply for {job.title}
              </DialogTitle>
              <DialogDescription>
                Review what information will be shared with the employer and submit your application.
              </DialogDescription>
            </DialogHeader>
            <JobApplicationForm
              job={job as any}
              userProfile={userProfile as any}
              hasApplied={hasApplied}
              onApplicationSubmitted={() => {
                setShowApplicationModal(false)
                setHasApplied(true)
                router.refresh()
              }}
              onClose={() => setShowApplicationModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Image Viewer */}
      {job.job_photo_url && (
        <Dialog open={showFullscreenImage} onOpenChange={setShowFullscreenImage}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{job.title} - Job Photo</DialogTitle>
              <DialogDescription>
                Full-screen view of the job photo. Click anywhere or press ESC to close.
              </DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={job.job_photo_url}
                alt={job.title}
                className="max-w-full max-h-[95vh] object-contain cursor-pointer"
                onClick={() => setShowFullscreenImage(false)}
              />
              <button
                onClick={() => setShowFullscreenImage(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold bg-black/50 hover:bg-black/70 rounded-full w-12 h-12 flex items-center justify-center transition-colors"
                aria-label="Close fullscreen image viewer"
              >
                ×
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
})

JobCard.displayName = "JobCard"

export default JobCard
