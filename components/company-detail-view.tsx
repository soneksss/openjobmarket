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
  onSignUpPrompt?: () => void
}

export default function CompanyDetailView({ company, user, isModal = false, onSignUpPrompt }: CompanyDetailViewProps) {
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
      if (onSignUpPrompt) {
        onSignUpPrompt()
      } else {
        router.push("/signup")
      }
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

  // Format address to compact format: "Street, City Postcode, Country"
  const formatAddress = (address: string) => {
    if (!address) return ''

    // Split by comma and remove empty parts
    const parts = address.split(',').map(p => p.trim()).filter(Boolean)

    if (parts.length === 0) return address

    // Extract key components
    const street = parts[0] // First part is usually the street
    let city = ''
    let postcode = ''
    let country = parts[parts.length - 1] // Last part is usually country

    // Find postcode (UK format: letters + numbers)
    const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/i
    const postcodeMatch = address.match(postcodeRegex)
    if (postcodeMatch) {
      postcode = postcodeMatch[0]
    }

    // Find main city name (look for "London", "Manchester", etc. - not borough names)
    const cityKeywords = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Sheffield', 'Edinburgh', 'Glasgow', 'Cardiff']
    for (const part of parts) {
      for (const keyword of cityKeywords) {
        if (part.includes(keyword) && !part.includes('Borough') && !part.includes('Greater')) {
          city = keyword
          break
        }
      }
      if (city) break
    }

    // If no city found, use second part (after street)
    if (!city && parts.length > 1) {
      city = parts[1]
    }

    // Shorten country names
    const countryShort: { [key: string]: string } = {
      'United Kingdom': 'UK',
      'United States': 'USA',
      'United States of America': 'USA'
    }
    country = countryShort[country] || country

    // Build compact address
    let compact = street
    if (city) {
      compact += `, ${city}`
    }
    if (postcode) {
      compact += ` ${postcode}`
    }
    if (country && country !== city) {
      compact += `, ${country}`
    }

    return compact
  }

  // Premium dark layout when opened from modal map
  if (isModal) {
    return (
      <div className="bg-slate-900 text-white rounded-lg overflow-hidden">
        {/* Gradient Hero */}
        <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 ring-2 ring-blue-500/40 flex-shrink-0">
              <AvatarImage src={company.logo_url} alt={company.company_name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-700 text-white font-bold text-xl">
                {getCompanyInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">{company.company_name}</h2>
              <p className="text-sm text-slate-300 mt-0.5">{company.industry}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />{formatAddress(company.location)}
              </p>
              <div className="mt-1.5">
                <RatingDisplay rating={company.average_rating || 0} reviewsCount={company.reviews_count || 0} size="sm" />
              </div>
            </div>
            {isOwnProfile && (
              <Button size="sm" variant="ghost" onClick={() => router.push("/company/profile/edit")} className="text-slate-400 hover:text-white shrink-0">Edit</Button>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{company.company_size}</span>
            {company.service_24_7 && (
              <span className="text-xs bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">24/7 Service</span>
            )}
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-800/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                <Sparkles className="h-2.5 w-2.5" />Hiring
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {company.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">About</p>
              <p className="text-sm text-slate-300 leading-relaxed">{company.description}</p>
            </div>
          )}

          {company.services && company.services.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Services</p>
              <div className="flex flex-wrap gap-1">
                {company.services.map((s, i) => (
                  <span key={i} className="text-xs bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-md">{s}</span>
                ))}
              </div>
            </div>
          )}

          {company.spoken_languages && company.spoken_languages.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Languages</p>
              <div className="flex flex-wrap gap-1">
                {company.spoken_languages.map((lang, i) => (
                  <span key={i} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {company.price_list && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Pricing</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{company.price_list}</p>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Industry</p>
              <p className="text-xs text-white font-medium">{company.industry}</p>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Size</p>
              <p className="text-xs text-white font-medium">{company.company_size}</p>
            </div>
          </div>

          {/* Active job openings */}
          {!loadingJobs && activeJobs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Open Positions</p>
              <div className="space-y-1.5">
                {activeJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between p-2.5 bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-lg group transition-colors">
                    <span className="text-xs text-slate-200 group-hover:text-white truncate">{job.title}</span>
                    <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-blue-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Website link */}
          {company.website_url && (
            <div className="flex flex-wrap gap-1.5">
              <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <Globe className="h-3 w-3" />Website
              </a>
            </div>
          )}

          {/* Contact button */}
          {!isOwnProfile && (
            <button
              onClick={handleContactClick}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              {user ? "Send Message" : "Sign Up to Contact"}
            </button>
          )}
        </div>

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

      <div className={isModal ? "px-4 py-4 max-w-5xl" : "container mx-auto px-4 py-4 max-w-5xl"}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Company Header Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 ring-2 ring-gray-100 flex-shrink-0">
                    <AvatarImage src={company.logo_url} alt={company.company_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                      {getCompanyInitials()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {company.company_name}
                    </h1>
                    <p className="text-sm text-gray-600 mb-2">{company.industry}</p>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{formatAddress(company.location)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {company.company_size}
                      </div>
                      {company.service_24_7 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-0">
                          24/7
                        </Badge>
                      )}
                      {activeJobs.length > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1 text-xs py-0">
                          <Sparkles className="h-3 w-3" />
                          Hiring
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <RatingDisplay
                        rating={company.average_rating || 0}
                        reviewsCount={company.reviews_count || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Company */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {company.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            {/* Languages */}
            {company.spoken_languages && company.spoken_languages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe2 className="h-4 w-4" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {company.spoken_languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
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
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {company.services.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
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
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {company.price_list}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Job Openings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" />
                  Job Openings
                  {activeJobs.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-auto text-xs">
                      {activeJobs.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingJobs ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : activeJobs.length > 0 ? (
                  <div className="space-y-2">
                    {activeJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1 truncate">
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{job.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                {new Date(job.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                    {activeJobs.length === 5 && (
                      <Link
                        href="/jobs"
                        className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
                      >
                        View All →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No active openings</p>
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
          <div className="space-y-4">
            {/* Contact Card */}
            {!isOwnProfile && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={handleContactClick}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Company Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Industry</div>
                  <div className="text-sm font-medium">{company.industry}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Size</div>
                  <div className="text-sm font-medium">{company.company_size}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Location</div>
                  <div className="text-sm font-medium flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{formatAddress(company.location)}</span>
                  </div>
                </div>

                {company.website_url && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Website</div>
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1.5 break-all"
                    >
                      <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">Visit Website</span>
                    </a>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Member Since</div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(company.created_at).toLocaleDateString('en-GB', {
                      month: 'short',
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
