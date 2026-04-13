"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Calendar,
  ArrowLeft,
  MessageCircle,
  Globe,
  Users,
  Briefcase,
  Globe2,
  PoundSterling,
  Sparkles,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Phone,
  Mail,
  PhoneCall,
  ShieldCheck,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  contact_email?: string
  logo_url?: string
  nickname?: string
  spoken_languages?: string[]
  service_24_7?: boolean
  services?: string[]
  price_list?: string
  average_rating?: number
  reviews_count?: number
  created_at: string
  business_type?: "limited_company" | "sole_trader" | null
  insurance_document_url?: string | null
  insurance_expiry_date?: string | null
}

interface User {
  id: string
  email: string
}

interface PortfolioPhoto {
  id: string
  photo_url: string
}

interface CompanyDetailViewProps {
  company: CompanyProfile
  user: User | null
  isModal?: boolean
  onSignUpPrompt?: () => void
  portfolioPhotos?: PortfolioPhoto[]
}

export default function CompanyDetailView({ company, user, isModal = false, onSignUpPrompt, portfolioPhotos: portfolioPhotosProp = [] }: CompanyDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [subjectInput, setSubjectInput] = useState("")
  const [sessionValidated, setSessionValidated] = useState(false)
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [fetchedPhotos, setFetchedPhotos] = useState<PortfolioPhoto[]>([])
  const [phoneRevealed, setPhoneRevealed] = useState(false)
  const [emailRevealed, setEmailRevealed] = useState(false)

  // Self-fetch portfolio photos when used in modal (no prop passed from server)
  useEffect(() => {
    if (portfolioPhotosProp.length > 0) return // already have them from server
    supabase
      .from("trades_portfolio_photos")
      .select("id, photo_url")
      .eq("tradesperson_id", company.id)
      .order("display_order", { ascending: true })
      .limit(6)
      .then(({ data }) => { if (data) setFetchedPhotos(data) })
  }, [company.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const portfolioPhotos = portfolioPhotosProp.length > 0 ? portfolioPhotosProp : fetchedPhotos

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
    setSubjectInput("")
    setShowMessageModal(true)
  }

  const startConversation = async () => {
    if (!user) return
    const subject = subjectInput.trim() || "General enquiry"
    const p1 = user.id < company.user_id ? user.id : company.user_id
    const p2 = user.id < company.user_id ? company.user_id : user.id
    const { data, error } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2, subject })
      .select("id")
      .single()
    setShowMessageModal(false)
    if (data?.id) router.push(`/messages/${data.id}`)
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

  // Format address — removes duplicate postcodes, produces: "Street, City POSTCODE, Country"
  const formatAddress = (address: string) => {
    if (!address) return ''

    const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi
    const postcodeMatch = address.match(postcodeRegex)
    const postcode = postcodeMatch ? postcodeMatch[0].toUpperCase() : ''

    // Strip all postcodes from parts so they never appear twice
    const cleaned = address
      .replace(postcodeRegex, '')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length === 0) return address

    const cityKeywords = ['London','Manchester','Birmingham','Leeds','Liverpool','Bristol','Sheffield','Edinburgh','Glasgow','Cardiff']
    let city = ''
    for (const part of parts) {
      for (const kw of cityKeywords) {
        if (part.includes(kw) && !part.includes('Borough') && !part.includes('Greater')) {
          city = kw; break
        }
      }
      if (city) break
    }
    if (!city && parts.length > 1) city = parts[1]

    const countryShort: Record<string, string> = { 'United Kingdom': 'UK', 'United States': 'USA', 'United States of America': 'USA' }
    const lastPart = parts[parts.length - 1]
    const country = countryShort[lastPart] || lastPart

    let compact = parts[0]
    if (city && city !== parts[0]) compact += `, ${city}`
    if (postcode) compact += ` ${postcode}`
    if (country && country !== city && country !== parts[0]) compact += `, ${country}`

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
            {company.business_type === "limited_company" && (
              <span className="text-xs bg-purple-800/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full">Ltd</span>
            )}
            {company.business_type === "sole_trader" && (
              <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/50 px-2 py-0.5 rounded-full">Sole trader</span>
            )}
            {company.insurance_document_url && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-800/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                ✓ Insured{company.insurance_expiry_date ? ` (exp ${new Date(company.insurance_expiry_date).toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })})` : ""}
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

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Sticky back bar — hidden in modal (Dialog's X button handles close) */}
      {!isModal && <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {isOwnProfile && (
            <button
              onClick={() => router.push("/company/profile/edit")}
              className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>}

      {/* Hero banner */}
      <div className="bg-gradient-to-b from-blue-950 via-slate-800/80 to-slate-900 border-b border-slate-700/40">
        <div className="container mx-auto px-4 pt-7 pb-6 max-w-4xl">
          <div className="flex gap-4 items-start">
            {/* Logo */}
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-blue-500/30 flex-shrink-0 rounded-2xl">
              <AvatarImage src={company.logo_url} alt={company.company_name} className="rounded-2xl" />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-700 text-white font-bold text-2xl rounded-2xl">
                {getCompanyInitials()}
              </AvatarFallback>
            </Avatar>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{company.company_name}</h1>
              {company.industry && (
                <p className="text-sm text-blue-300 mt-0.5 font-medium">{company.industry}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-slate-500" />
                    {formatAddress(company.location)}
                  </span>
                )}
                {company.company_size && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-slate-500" />
                    {company.company_size}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  Since {new Date(company.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {company.service_24_7 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-2.5 w-2.5" />24/7 Service
                  </span>
                )}
                {activeJobs.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-900/50 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-2.5 w-2.5" />Hiring
                  </span>
                )}
                {company.business_type === "limited_company" && (
                  <span className="text-xs bg-purple-800/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full">Ltd</span>
                )}
                {company.business_type === "sole_trader" && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/50 px-2 py-0.5 rounded-full">Sole trader</span>
                )}
                {company.insurance_document_url && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-800/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                    ✓ Insured{company.insurance_expiry_date ? ` (exp ${new Date(company.insurance_expiry_date).toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })})` : ""}
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                <RatingDisplay rating={company.average_rating || 0} reviewsCount={company.reviews_count || 0} size="sm" />
              </div>
            </div>
          </div>

          {/* Mobile CTA — visible below sm, hidden on lg (sidebar handles it) */}
          {!isOwnProfile && (
            <div className="flex gap-2 mt-5 lg:hidden">
              <button
                onClick={handleContactClick}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                {user ? "Message" : "Sign Up to Contact"}
              </button>
              <button
                onClick={handleSaveToggle}
                disabled={savingState}
                title={isSaved ? "Unsave" : "Save tradesperson"}
                className={`px-4 py-2.5 rounded-xl flex items-center justify-center transition-colors border ${
                  isSaved
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                    : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Details — mobile only (desktop shows in sidebar) */}
            {(company.phone_number || company.contact_email || company.website_url || company.created_at) && (
              <section className="lg:hidden bg-slate-800 rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</p>

                {company.phone_number && (
                  phoneRevealed ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <a href={`tel:${company.phone_number}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors">
                        {company.phone_number}
                      </a>
                      <a href={`tel:${company.phone_number}`}
                        className="ml-auto flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                      >
                        <PhoneCall className="h-3 w-3" />
                        Call
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPhoneRevealed(true)}
                      className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>Show Phone Number</span>
                      <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                    </button>
                  )
                )}

                {company.contact_email && (
                  emailRevealed ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <a href={`mailto:${company.contact_email}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors truncate">
                        {company.contact_email}
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEmailRevealed(true)}
                      className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>Show Email Address</span>
                      <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                    </button>
                  )
                )}

                {company.website_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors truncate">
                      Visit Website
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  Member since {new Date(company.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </div>
              </section>
            )}

            {/* Previous Work — portfolio photos */}
            {portfolioPhotos.length > 0 && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5" />Previous Work
                </h2>

                {/* Cover photo — full width */}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  className="w-full rounded-xl overflow-hidden border border-slate-700/60 hover:border-emerald-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-2 block"
                >
                  <img
                    src={portfolioPhotos[0].photo_url}
                    alt="Portfolio cover"
                    className="w-full h-48 object-cover hover:scale-[1.02] transition-transform duration-200"
                    loading="lazy"
                  />
                </button>

                {/* Remaining photos — 3-col grid */}
                {portfolioPhotos.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {portfolioPhotos.slice(1).map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setLightboxIndex(idx + 1)}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-700/60 hover:border-emerald-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <img
                          src={photo.photo_url}
                          alt={`Portfolio photo ${idx + 2}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* About */}
            {company.description && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">About</h2>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{company.description}</p>
              </section>
            )}

            {/* Services */}
            {company.services && company.services.length > 0 && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />Services
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.services.map((s) => (
                    <span key={s} className="text-xs bg-slate-700 text-slate-200 border border-slate-600/80 px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Pricing */}
            {company.price_list && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <PoundSterling className="h-3.5 w-3.5" />Pricing
                </h2>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{company.price_list}</p>
              </section>
            )}

            {/* Languages */}
            {company.spoken_languages && company.spoken_languages.length > 0 && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" />Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.spoken_languages.map((lang) => (
                    <span key={lang} className="text-xs bg-slate-700 text-slate-300 border border-slate-600/80 px-2.5 py-1 rounded-lg">{lang}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Open Positions */}
            {!loadingJobs && activeJobs.length > 0 && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />Open Positions
                </h2>
                <div className="space-y-1.5">
                  {activeJobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between p-2.5 bg-slate-700/50 border border-slate-600/60 hover:border-blue-500/50 rounded-xl group transition-colors">
                      <span className="text-sm text-slate-200 group-hover:text-white truncate">{job.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 flex-shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          <div className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">

            {/* CTA */}
            {!isOwnProfile && (
              <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
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
                  className={`mt-2 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium border ${
                    isSaved
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaved ? "Saved" : "Save Tradesperson"}
                </button>
              </div>
            )}

            {/* Quick info — only non-hero fields */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</p>

              {company.phone_number && (
                phoneRevealed ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <a href={`tel:${company.phone_number}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors flex-1 min-w-0 truncate">
                      {company.phone_number}
                    </a>
                    <a href={`tel:${company.phone_number}`}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex-shrink-0"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Call
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhoneRevealed(true)}
                    className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>Show Phone Number</span>
                    <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                  </button>
                )
              )}

              {company.contact_email && (
                emailRevealed ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <a href={`mailto:${company.contact_email}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors truncate">
                      {company.contact_email}
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEmailRevealed(true)}
                    className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>Show Email Address</span>
                    <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                  </button>
                )
              )}

              {company.website_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors truncate"
                  >
                    Visit Website
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                Member since {new Date(company.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews — full width, bottom ── */}
        <div className="mt-6">
          <ReviewsList
            userId={company.user_id}
            userType="company"
            title="Reviews"
          />
        </div>
      </div>

      {/* Subject dialog */}
      <Dialog open={showMessageModal} onOpenChange={(open) => { if (!open) setShowMessageModal(false) }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">New Message to {company.company_name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a subject so the tradesperson knows what this is about.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Plumbing repair quote"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startConversation() }}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMessageModal(false)}>Cancel</Button>
            <Button onClick={startConversation}>Start Conversation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! > 0 ? i! - 1 : i)) }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Image */}
          <img
            src={portfolioPhotos[lightboxIndex].photo_url}
            alt={`Portfolio photo ${lightboxIndex + 1}`}
            className="max-h-[88vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIndex < portfolioPhotos.length - 1 && (
            <button
              className="absolute right-3 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! < portfolioPhotos.length - 1 ? i! + 1 : i)) }}
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60 font-medium">
            {lightboxIndex + 1} / {portfolioPhotos.length}
          </div>
        </div>
      )}
    </div>
  )
}
