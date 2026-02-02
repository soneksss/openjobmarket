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
import ProfileModal from "@/components/profile-modal"
import { useTranslation } from "@/lib/i18n/context"

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
  is_tradespeople_job?: boolean
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
    average_rating?: number
    reviews_count?: number
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
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSignUpDialog, setShowSignUpDialog] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedProfileType, setSelectedProfileType] = useState<"professional" | "company" | "contractor" | "homeowner" | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [userType, setUserType] = useState<string | null>(null)

  // Track touch events to distinguish tap from scroll
  const [touchStartY, setTouchStartY] = useState<number | null>(null)

  // Handle card selection (works for both click and touch)
  const handleCardSelect = () => {
    onSelect?.()
  }

  // Locale-aware auth URLs
  const isOnBrRoute = pathname?.startsWith('/br')
  const signUpUrl = isOnBrRoute
    ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/sign-up'
  const loginUrl = isOnBrRoute
    ? `/auth/login?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/login'

  // Auto-expand when selected from map pin click or card click
  // Auto-collapse when deselected (another job is selected)
  useEffect(() => {
    setIsExpanded(isSelected)

    // Scroll card into view when expanded to show buttons
    if (isSelected && ref && typeof ref !== 'function' && ref.current) {
      // Delay scroll to allow expansion animation to complete
      setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest', // Keep as much of the card visible as possible
          inline: 'nearest'
        })
        // Additional scroll to ensure bottom of card (buttons) is visible
        setTimeout(() => {
          const cardElement = ref.current
          if (cardElement) {
            const cardRect = cardElement.getBoundingClientRect()
            const container = cardElement.closest('.overflow-y-auto')
            if (container) {
              const containerRect = container.getBoundingClientRect()
              const cardBottom = cardRect.bottom
              const containerBottom = containerRect.bottom

              // If card bottom is below container bottom, scroll down more
              if (cardBottom > containerBottom) {
                const scrollAmount = cardBottom - containerBottom + 20 // 20px padding
                container.scrollBy({ top: scrollAmount, behavior: 'smooth' })
              }
            }
          }
        }, 300)
      }, 200)
    }
  }, [isSelected, ref])

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
  // Check: homeowner name (from enrichment) -> company_profiles join -> poster_company_name (enrichment fallback) -> Anonymous
  const posterName =
    (job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
    job.company_profiles?.company_name ||
    job.poster_company_name ||
    "Anonymous"

  const companyName = job.company_profiles?.company_name || job.poster_company_name
  const logoUrl = job.poster_logo_url || job.company_profiles?.logo_url

  // Get profile URL (company or homeowner)
  const profileUrl = job.company_profiles?.id
    ? `/companies/${job.company_profiles.id}`
    : job.homeowner_profiles?.id
    ? `/homeowners/${job.homeowner_profiles.id}`
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

  // Fetch user type
  useEffect(() => {
    const fetchUserType = async () => {
      if (!isLoggedIn) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (userData) {
          setUserType(userData.user_type)
        }
      }
    }

    fetchUserType()
  }, [isLoggedIn])

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

  // Check if job is already saved
  useEffect(() => {
    const checkSaved = async () => {
      if (!userProfile) return

      const supabase = createClient()
      const { data } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("job_id", job.id)
        .eq("professional_id", userProfile.id)
        .maybeSingle()

      setIsSaved(!!data)
    }

    checkSaved()
  }, [userProfile, job.id])

  const handleApplyClick = async () => {
    if (!isLoggedIn) {
      setShowSignUpDialog(true)
      return
    }

    // Check if user is trying to apply to their own job
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const isOwnJob = job.company_profiles?.user_id === user.id ||
                       job.homeowner_profiles?.user_id === user.id

      if (isOwnJob) {
        // Redirect to job detail page to show proper blocked message
        router.push(`/jobs/${job.id}`)
        return
      }
    }

    if (!userProfile) {
      // If logged in but no profile loaded, redirect to job detail page where profile will be fetched
      router.push(`/jobs/${job.id}`)
    } else if (!hasApplied) {
      // Open application modal directly
      setShowApplicationModal(true)
    }
  }

  const handleSaveClick = async () => {
    if (!isLoggedIn) {
      setShowSignUpDialog(true)
      return
    }

    if (!userProfile) {
      // Redirect to login if no profile (shouldn't happen if isLoggedIn is true)
      setShowSignUpDialog(true)
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    try {
      if (isSaved) {
        // Unsave the job
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("job_id", job.id)
          .eq("professional_id", userProfile.id)

        if (error) {
          console.error("[JOB-CARD] Error unsaving job:", error)
          alert("Failed to unsave job. Please try again.")
        } else {
          setIsSaved(false)
        }
      } else {
        // Save the job
        const { error } = await supabase
          .from("saved_jobs")
          .insert({
            job_id: job.id,
            professional_id: userProfile.id
          })

        if (error) {
          console.error("[JOB-CARD] Error saving job:", error)
          alert("Failed to save job. Please try again.")
        } else {
          setIsSaved(true)
        }
      }
    } catch (error) {
      console.error("[JOB-CARD] Error in save/unsave operation:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (job.company_profiles?.id) {
      setSelectedProfileType("company")
      setSelectedProfileId(job.company_profiles.id)
      setShowProfileModal(true)
    } else if (job.homeowner_profiles?.id) {
      setSelectedProfileType("homeowner")
      setSelectedProfileId(job.homeowner_profiles.id)
      setShowProfileModal(true)
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
        onClick={handleCardSelect}
        onTouchStart={(e) => {
          setTouchStartY(e.touches[0].clientY)
        }}
        onTouchEnd={(e) => {
          if (touchStartY !== null) {
            const touchEndY = e.changedTouches[0].clientY
            const diff = Math.abs(touchEndY - touchStartY)
            // Only trigger selection if it's a tap (not a scroll)
            if (diff < 10) {
              handleCardSelect()
            }
          }
          setTouchStartY(null)
        }}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-3">
            {/* Job Details */}
            <div className="flex-1 min-w-0">
              {/* Poster Info - Only show when expanded */}
              {isExpanded && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  {(logoUrl || posterName) && (
                    <>
                      {(job.company_profiles?.id || job.homeowner_profiles?.id) ? (
                        <div
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0 cursor-pointer"
                          onClick={handleProfileClick}
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
                        </div>
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
              <div className="flex items-start gap-2 mb-1.5 sm:mb-1">
                <h3
                  className={`text-lg sm:text-xl font-semibold text-gray-900 transition-colors leading-tight flex-1 ${isExpanded ? 'hover:text-blue-600 cursor-pointer' : ''}`}
                  onClick={(e) => {
                    // Only navigate when card is already expanded
                    if (isExpanded) {
                      e.stopPropagation()
                      router.push(`/jobs/${job.id}`)
                    }
                  }}
                >
                  {job.title}
                </h3>
                {job.is_tradespeople_job ? (
                  <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs px-2 py-0.5 flex-shrink-0 mt-0.5">
                    {t('jobs.tradeJob')}
                  </Badge>
                ) : (
                  <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs px-2 py-0.5 flex-shrink-0 mt-0.5">
                    {t('jobs.vacancy')}
                  </Badge>
                )}
              </div>

              {/* Company Name with Stars - Show in collapsed view */}
              {!isExpanded && companyName && (
                <div className="mb-2">
                  {(job.company_profiles?.id || job.homeowner_profiles?.id) ? (
                    <div
                      className="inline-flex items-start gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={handleProfileClick}
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
                    </div>
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
              <p className="text-sm sm:text-sm text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                {shortDesc?.substring(0, 120) + (shortDesc && shortDesc.length > 120 ? "..." : "")}
              </p>

              {/* Price */}
              {salary && (
                <div className="text-sm sm:text-sm font-bold text-green-600 mb-2">
                  {salary} <span className="text-gray-500 font-normal text-xs">(per job)</span>
                </div>
              )}

              {/* Skills - Always show top 3 */}
              {topSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-1 mb-2">
                  {topSkills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-green-50 border-green-200 text-green-700 px-2 py-1"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {job.skills_required?.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-500 px-2 py-1">
                      +{job.skills_required.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons - ALWAYS VISIBLE */}
              <div className="flex items-center justify-between gap-2 mb-2 mt-3">
                <span className="text-xs sm:text-xs text-gray-500 flex-shrink-0">
                  {formatDate(job.created_at)}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 sm:h-7 sm:w-7 p-0 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveClick()
                    }}
                    disabled={isSaving}
                  >
                    <Heart className={`h-4 w-4 sm:h-3 sm:w-3 ${isSaved ? "fill-current text-red-600" : ""}`} />
                  </Button>

                  {/* Hide message button for companies/contractors on vacancies */}
                  {!(
                    !job.is_tradespeople_job &&
                    (userType === 'company' || userType === 'contractor')
                  ) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 sm:h-7 sm:w-7 p-0 touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContactClick()
                      }}
                    >
                      <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    className={hasApplied
                      ? "h-9 px-4 sm:h-7 sm:px-3 bg-green-600 text-white cursor-not-allowed text-sm sm:text-xs touch-manipulation"
                      : "h-9 px-4 sm:h-7 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-xs touch-manipulation font-medium"
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!hasApplied) {
                        handleApplyClick()
                      }
                    }}
                    disabled={hasApplied}
                  >
                    {hasApplied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>

              {/* Expanded Details - Extra info only */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 sm:space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Full Description */}
                  {longDesc && longDesc.length > 120 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1.5">Full Description:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                        {longDesc}
                      </p>
                    </div>
                  )}

                  {/* Job Photo */}
                  {job.job_photo_url && (
                    <div className="mb-3">
                      <img
                        src={job.job_photo_url}
                        alt={job.title}
                        className="w-full max-h-[200px] sm:max-h-[250px] object-cover rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
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
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-2">{displayAddress}</span>
                  </div>

                  {/* Job Type Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {job.job_type}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs">
                      {job.work_location}
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs">
                      {job.experience_level}
                    </Badge>
                  </div>

                  {/* All Skills (if more than 3) */}
                  {job.skills_required && job.skills_required.length > 3 && (
                    <div>
                      <p className="text-sm text-gray-700 font-medium mb-1">All Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {job.skills_required.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-green-50 border-green-200 text-green-700"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{job.applications_count} application{job.applications_count !== 1 ? 's' : ''}</span>
                    </div>
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

      {/* Profile Modal */}
      {showProfileModal && selectedProfileType && selectedProfileId && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profileType={selectedProfileType}
          profileId={selectedProfileId}
        />
      )}
    </>
  )
})

JobCard.displayName = "JobCard"

export default JobCard
