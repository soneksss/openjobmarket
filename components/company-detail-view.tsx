"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Building2,
  MapPin,
  Calendar,
  ArrowLeft,
  MessageCircle,
  Mail,
  Phone,
  Globe,
  Users,
  Briefcase,
  Star,
  Globe2,
  DollarSign,
  Sparkles,
  ExternalLink,
  Clock
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import UserReviewsDisplay from "./user-reviews-display"
import { RatingDisplay } from "./rating-display"
import { ReviewsList } from "./reviews-list"

interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  description: string
  industry: string
  location: string
  latitude?: number
  longitude?: number
  company_size: string
  website_url?: string
  phone_number?: string
  logo_url?: string
  nickname?: string
  spoken_languages?: string[]
  service_24_7?: boolean
  services?: string[]
  price_list?: string
  average_rating?: number
  reviews_count?: number
  created_at: string
}

interface User {
  id: string
  email: string
}

interface CompanyDetailViewProps {
  company: CompanyProfile
  user: User | null
  isModal?: boolean
}

export default function CompanyDetailView({ company, user, isModal = false }: CompanyDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  const isOwnProfile = user?.id === company.user_id

  useEffect(() => {
    console.log("[COMPANY-DETAIL-VIEW] Component loaded:", {
      companyId: company.id,
      companyName: company.company_name,
      userId: user?.id,
      isOwnProfile
    })

    // Validate session on client side if user was provided from server
    if (user && !sessionValidated) {
      validateSession()
    }

    // Fetch active job openings
    fetchActiveJobs()
  }, [user, sessionValidated])

  const fetchActiveJobs = async () => {
    setLoadingJobs(true)
    try {
      const { data: jobs, error } = await supabase
        .from("job_status_view")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .neq("expiration_status", "expired")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) {
        console.error("[COMPANY-DETAIL-VIEW] Error fetching jobs:", error)
      } else {
        setActiveJobs(jobs || [])
        console.log("[COMPANY-DETAIL-VIEW] Loaded active jobs:", jobs?.length || 0)
      }
    } catch (error) {
      console.error("[COMPANY-DETAIL-VIEW] Error fetching active jobs:", error)
    } finally {
      setLoadingJobs(false)
    }
  }

  const validateSession = async () => {
    console.log("[COMPANY-DETAIL-VIEW] Validating client session...")
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error("[COMPANY-DETAIL-VIEW] Session validation error:", error)
        return
      }

      if (session) {
        console.log("[COMPANY-DETAIL-VIEW] Session validated successfully")
        setSessionValidated(true)
      } else {
        console.log("[COMPANY-DETAIL-VIEW] No active session found")
      }
    } catch (error) {
      console.error("[COMPANY-DETAIL-VIEW] Error validating session:", error)
    }
  }

  const handleContactClick = () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    setShowMessageModal(true)
  }

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      // No history, redirect to search page as fallback
      router.push('/search')
    }
  }

  const getCompanyInitials = () => {
    return company.company_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className={isModal ? "" : "min-h-screen bg-gradient-to-b from-gray-50 to-white"}>
      {/* Header */}
      {!isModal && (
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      )}

      <div className={isModal ? "px-4 py-8 max-w-5xl" : "container mx-auto px-4 py-8 max-w-5xl"}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <Avatar className="w-24 h-24 ring-4 ring-gray-100">
                    <AvatarImage src={company.logo_url} alt={company.company_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                      {getCompanyInitials()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                          {company.company_name}
                        </h1>
                        <p className="text-lg text-gray-600 mb-2">{company.industry}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {company.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {company.company_size}
                      </div>
                      {company.service_24_7 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          24/7 Service
                        </Badge>
                      )}
                      {activeJobs.length > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          We're Hiring
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <RatingDisplay
                        rating={company.average_rating || 0}
                        reviewsCount={company.reviews_count || 0}
                        size="md"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Company */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  About {company.company_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {company.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            {/* Languages */}
            {company.spoken_languages && company.spoken_languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {company.spoken_languages.map((lang) => (
                      <Badge key={lang} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {company.services && company.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Services Offered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {company.services.map((service) => (
                      <Badge key={service} variant="secondary" className="text-sm">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price List */}
            {company.price_list && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Price List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {company.price_list}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Job Openings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Active Job Openings
                  {activeJobs.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2">
                      {activeJobs.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : activeJobs.length > 0 ? (
                  <div className="space-y-4">
                    {activeJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Posted {new Date(job.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                    {activeJobs.length === 5 && (
                      <Link
                        href="/jobs"
                        className="block text-center text-blue-600 hover:text-blue-700 font-medium py-2"
                      >
                        View All Openings →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active job openings at this time</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <ReviewsList
              userId={company.user_id}
              userType="company"
              title="Reviews"
              limit={5}
              showViewAll={true}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            {!isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleContactClick}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Industry</div>
                  <div className="font-medium">{company.industry}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Company Size</div>
                  <div className="font-medium">{company.company_size}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Location</div>
                  <div className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {company.location}
                  </div>
                </div>

                {company.website_url && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Website</div>
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 mb-1">Member Since</div>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(company.created_at).toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && user && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          professionalId={company.user_id}
          professionalName={company.company_name}
          user={user}
        />
      )}
    </div>
  )
}
