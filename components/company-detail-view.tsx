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
  Clock,
  Bookmark,
  BookmarkCheck,
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
  const [isSaved, setIsSaved] = useState(false)
  const [savingState, setSavingState] = useState(false)

  useEffect(() => {
    if (!user || isOwnProfile) return
    // Check if this tradesperson is already saved
    supabase
      .from("homeowner_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: hp }) => {
        if (!hp) return
        supabase
          .from("saved_traders")
          .select("id")
          .eq("homeowner_id", hp.id)
          .eq("company_id", company.id)
          .maybeSingle()
          .then(({ data }) => setIsSaved(!!data))
      })
  }, [user?.id, company.id])

  const handleSaveToggle = async () => {
    if (!user) { router.push("/auth/sign-up"); return }
    setSavingState(true)
    try {
      const { data: hp } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (!hp) return
      if (isSaved) {
        await supabase
          .from("saved_traders")
          .delete()
          .eq("homeowner_id", hp.id)
          .eq("company_id", company.id)
        setIsSaved(false)
      } else {
        await supabase
          .from("saved_traders")
          .insert({ homeowner_id: hp.id, company_id: company.id })
        setIsSaved(true)
      }
    } catch (e) {
      console.error("[SAVE] Error:", e)
    } finally {
      setSavingState(false)
    }
  }

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
            <div className="flex gap-2">
              <button
                onClick={handleContactClick}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                {user ? "Message" : "Sign Up"}
              </button>
              <button
                onClick={handleSaveToggle}
                disabled={savingState}
                title={isSaved ? "Unsave" : "Save tradesperson"}
                className={`px-4 py-3 rounded-xl flex items-center justify-center transition-colors border ${
                  isSaved
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
                }`}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            </div>
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sticky back bar */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 ring-2 ring-blue-500/30 flex-shrink-0">
              <AvatarImage src={company.logo_url} alt={company.company_name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-700 text-white font-bold text-2xl">
                {getCompanyInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white">{company.company_name}</h1>
                  {company.industry && (
                    <p className="text-sm text-slate-300 mt-0.5">{company.industry}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {formatAddress(company.location)}
                    </span>
                    {company.company_size && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {company.company_size}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Since {new Date(company.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {isOwnProfile && (
                  <button
                    onClick={() => router.push("/company/profile/edit")}
                    className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {company.service_24_7 && (
                  <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-full">24/7 Service</span>
                )}
                {activeJobs.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-900/50 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" />Hiring
                  </span>
                )}
              </div>

              <div className="mt-3">
                <RatingDisplay rating={company.average_rating || 0} reviewsCount={company.reviews_count || 0} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">

            {/* About */}
            {company.description && (
              <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">About</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{company.description}</p>
              </div>
            )}

            {/* Services */}
            {company.services && company.services.length > 0 && (
              <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />Services
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.services.map((s) => (
                    <span key={s} className="text-xs bg-slate-700 text-slate-200 border border-slate-600 px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            {company.price_list && (
              <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />Pricing
                </p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{company.price_list}</p>
              </div>
            )}

            {/* Languages */}
            {company.spoken_languages && company.spoken_languages.length > 0 && (
              <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" />Languages
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.spoken_languages.map((lang) => (
                    <span key={lang} className="text-xs bg-slate-700 text-slate-300 border border-slate-600 px-2.5 py-1 rounded-lg">{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <ReviewsList
              userId={company.user_id}
              userType="company"
              title="Reviews"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact */}
            {!isOwnProfile && (
              <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Contact</p>
                <button
                  onClick={handleContactClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  {user ? "Send Message" : "Sign Up to Contact"}
                </button>
                <button
                  onClick={handleSaveToggle}
                  disabled={savingState}
                  className={`mt-2 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-semibold border ${
                    isSaved
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaved ? "Saved" : "Save Tradesperson"}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Information</p>

              {company.industry && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Industry</p>
                  <p className="text-sm text-white font-medium">{company.industry}</p>
                </div>
              )}

              {company.company_size && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Company size</p>
                  <p className="text-sm text-white font-medium">{company.company_size}</p>
                </div>
              )}

              <div>
                <p className="text-[11px] text-slate-500 mb-0.5">Location</p>
                <p className="text-sm text-white font-medium flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  {formatAddress(company.location)}
                </p>
              </div>

              {company.website_url && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Website</p>
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    Visit Website
                  </a>
                </div>
              )}
            </div>
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
