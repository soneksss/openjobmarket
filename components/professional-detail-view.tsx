"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  ArrowLeft,
  MessageCircle,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Github,
  Linkedin,
  User,
  Target,
  FileText,
  CheckCircle,
  Crown,
  Zap,
  Languages as LanguagesIcon,
  TrendingUp,
  Car,
  Clock,
  Bookmark,
  BookmarkCheck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import { usePremiumStatus } from "@/hooks/use-premium-status"
import UserReviewsDisplay from "./user-reviews-display"
import { RatingDisplay } from "./rating-display"
import { ReviewsList } from "./reviews-list"

interface ProfessionalProfile {
  id: string
  user_id: string
  first_name?: string
  last_name?: string
  nickname?: string
  title: string
  bio: string
  location: string
  latitude?: number
  longitude?: number
  experience_level: string
  skills: string[]
  languages?: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  phone?: string
  salary_min?: number
  salary_max?: number
  available_for_work: boolean
  actively_looking?: boolean
  actively_looking_until?: string
  is_self_employed: boolean
  ready_to_relocate?: boolean
  has_driving_licence?: boolean
  has_own_transport?: boolean
  employment_status?: string
  availability?: 'available_now' | 'available_week' | 'available_month' | 'not_specified'
  profile_photo_url?: string
  cv_url?: string
  average_rating?: number
  reviews_count?: number
  created_at: string
}

interface User {
  id: string
  email: string
}

interface ProfessionalDetailViewProps {
  professional: ProfessionalProfile
  user: User | null
  userType: "professional" | "company" | "contractor" | "homeowner" | null
  isModal?: boolean
  onSignUpPrompt?: () => void
}

export default function ProfessionalDetailView({ professional, user, userType, isModal = false, onSignUpPrompt }: ProfessionalDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)
  const [returnPath, setReturnPath] = useState<string | null>(null)

  const isEmployer = userType === "company"
  const isOwnProfile = user?.id === professional.user_id
  const isHomeowner = userType === "homeowner"

  const [isSaved, setIsSaved] = useState(false)
  const [isSavingToggle, setIsSavingToggle] = useState(false)

  // Check if homeowner has saved this tradesperson
  useEffect(() => {
    if (!user || !isHomeowner) return
    const checkSaved = async () => {
      const { data: hp } = await supabase.from("homeowner_profiles").select("id").eq("user_id", user.id).single()
      if (!hp) return
      const { data } = await supabase.from("saved_traders").select("id").eq("homeowner_id", hp.id).eq("professional_id", professional.id).maybeSingle()
      setIsSaved(!!data)
    }
    checkSaved()
  }, [user, isHomeowner, professional.id])

  const handleToggleSave = async () => {
    if (!user) { onSignUpPrompt?.(); return }
    setIsSavingToggle(true)
    try {
      const { data: hp } = await supabase.from("homeowner_profiles").select("id").eq("user_id", user.id).single()
      if (!hp) return
      if (isSaved) {
        await supabase.from("saved_traders").delete().eq("homeowner_id", hp.id).eq("professional_id", professional.id)
        setIsSaved(false)
      } else {
        await supabase.from("saved_traders").insert({ homeowner_id: hp.id, professional_id: professional.id })
        setIsSaved(true)
      }
    } finally {
      setIsSavingToggle(false)
    }
  }

  // Track where the user came from on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer
      if (referrer.includes('/tasks')) {
        setReturnPath('/tasks')
      } else if (referrer.includes('/jobs')) {
        setReturnPath('/jobs')
      } else if (referrer.includes('/professionals')) {
        setReturnPath('/professionals')
      }
    }
  }, [])

  // NOTE: Subscriptions are only for companies and contractors (businesses), not jobseekers/professionals
  // Passing 'professional' ensures the hook returns early without checking
  const premiumStatus = usePremiumStatus(professional.user_id, 'professional')

  useEffect(() => {
    console.log("[PROFESSIONAL-DETAIL-VIEW] Component loaded:", {
      professionalId: professional.id,
      professionalName: `${professional.first_name || ''}${professional.last_name ? ' ' + professional.last_name : ''}`,
      userId: user?.id,
      userType,
      isEmployer,
      isOwnProfile
    })

    // Validate session on client side if user was provided from server
    if (user && !sessionValidated) {
      validateSession()
    }
  }, [user, sessionValidated])

  const validateSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error("[PROFESSIONAL-DETAIL-VIEW] Session validation error:", error)
      } else {
        console.log("[PROFESSIONAL-DETAIL-VIEW] Session validated successfully")
        setSessionValidated(true)
      }
    } catch (error) {
      console.error("[PROFESSIONAL-DETAIL-VIEW] Session validation failed:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const formatAvailability = (availability?: string) => {
    if (!availability || availability === 'not_specified') return 'Not specified'
    switch (availability) {
      case 'available_now':
        return 'Available now'
      case 'available_week':
        return 'Available within a week'
      case 'available_month':
        return 'Available within a month'
      default:
        return 'Not specified'
    }
  }

  const handleContact = () => {
    if (!user) {
      if (onSignUpPrompt) {
        onSignUpPrompt()
      } else {
        router.push("/signup")
      }
      return
    }

    // Companies, contractors, and homeowners can contact professionals
    if (userType === "company" || userType === "contractor" || userType === "homeowner") {
      setShowMessageModal(true)
    }
  }

  const handleEditProfile = () => {
    router.push("/profile/edit")
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

  const displayName = professional.nickname || `${professional.first_name || ''}${professional.last_name ? ' ' + professional.last_name.charAt(0) + '.' : ''}`
  const salaryDisplay = formatSalary(professional.salary_min, professional.salary_max)

  // Premium dark layout when opened from modal map
  if (isModal) {
    const langsToShow: string[] = professional.languages || (professional as any).spoken_languages || []
    const canContactModal = userType === "company" || userType === "contractor"

    return (
      <div className="bg-slate-900 text-white rounded-lg overflow-hidden">
        {/* Gradient Hero */}
        <div className="bg-gradient-to-br from-blue-950 via-slate-800 to-slate-900 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 ring-2 ring-blue-500/40 flex-shrink-0">
              <AvatarImage src={professional.profile_photo_url} alt={displayName} />
              <AvatarFallback className="bg-blue-900 text-blue-200 font-bold text-xl">
                {professional.first_name?.charAt(0) || ''}{professional.last_name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">{displayName}</h2>
                {premiumStatus.isPremium && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    <Crown className="h-2.5 w-2.5" />PREMIUM
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-0.5 font-medium">{professional.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />{professional.location}
              </p>
              <div className="mt-1.5">
                <RatingDisplay rating={professional.average_rating || 0} reviewsCount={professional.reviews_count || 0} size="sm" />
              </div>
            </div>
            {isOwnProfile && (
              <Button size="sm" variant="ghost" onClick={handleEditProfile} className="text-slate-400 hover:text-white shrink-0">Edit</Button>
            )}
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize">{professional.experience_level}</span>
            {professional.is_self_employed && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Self-Employed</span>
            )}
            {professional.actively_looking && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-2.5 w-2.5" />Actively Looking
              </span>
            )}
            {!professional.actively_looking && professional.available_for_work && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-800/60 text-green-300 border border-green-700/50 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-2.5 w-2.5" />Available
              </span>
            )}
            {salaryDisplay && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                {salaryDisplay}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {professional.bio && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">About</p>
              <p className="text-sm text-slate-300 leading-relaxed">{professional.bio}</p>
            </div>
          )}

          {professional.skills && professional.skills.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1">
                {professional.skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-md">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {langsToShow.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Languages</p>
              <div className="flex flex-wrap gap-1">
                {langsToShow.map((lang: string, i: number) => (
                  <span key={i} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Employment</p>
              <p className="text-xs text-white font-medium">{professional.is_self_employed ? "Self-Employed" : "Employed"}</p>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Availability</p>
              <p className={`text-xs font-medium ${professional.available_for_work ? 'text-emerald-400' : 'text-red-400'}`}>
                {professional.available_for_work ? (professional.availability ? formatAvailability(professional.availability) : 'Available') : 'Not Available'}
              </p>
            </div>
            {professional.has_driving_licence && (
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-300 font-medium">Driving Licence</p>
              </div>
            )}
            {professional.has_own_transport && (
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 flex items-center gap-2">
                <Car className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-300 font-medium">Own Transport</p>
              </div>
            )}
            {professional.ready_to_relocate && (
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-300 font-medium">Ready to Relocate</p>
              </div>
            )}
          </div>

          {/* Links */}
          {(professional.portfolio_url || professional.linkedin_url || professional.github_url || professional.website_url || professional.cv_url) && (
            <div className="flex flex-wrap gap-1.5">
              {professional.cv_url && (
                <a href={professional.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <FileText className="h-3 w-3" />CV
                </a>
              )}
              {professional.portfolio_url && (
                <a href={professional.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <ExternalLink className="h-3 w-3" />Portfolio
                </a>
              )}
              {professional.linkedin_url && (
                <a href={professional.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Linkedin className="h-3 w-3" />LinkedIn
                </a>
              )}
              {professional.github_url && (
                <a href={professional.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Github className="h-3 w-3" />GitHub
                </a>
              )}
              {professional.website_url && (
                <a href={professional.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Globe className="h-3 w-3" />Website
                </a>
              )}
            </div>
          )}

          {/* Contact Button */}
          {!isOwnProfile && (
            <button
              onClick={handleContact}
              disabled={!!user && !canContactModal && !isHomeowner}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              {user
                ? (canContactModal || isHomeowner) ? "Send Message" : "Contact Restricted"
                : "Sign Up to Contact"}
            </button>
          )}

          {/* Save Tradesperson — homeowners only */}
          {!isOwnProfile && (isHomeowner || !user) && (
            <button
              onClick={handleToggleSave}
              disabled={isSavingToggle}
              className={`w-full font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm border ${
                isSaved
                  ? "bg-emerald-900/40 border-emerald-600 text-emerald-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? "Saved" : "Save Tradesperson"}
            </button>
          )}

          {user && !isOwnProfile && !canContactModal && !isHomeowner && (
            <p className="text-xs text-slate-500 text-center">Only employers and tradespeople can contact professionals</p>
          )}
        </div>

        {showMessageModal && (
          <MessageModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            professionalId={professional.id}
            professionalName={`${professional.first_name || ''}${professional.last_name ? ' ' + professional.last_name : ''}`}
            user={user}
          />
        )}
      </div>
    )
  }

  return (
    <div className={isModal ? "" : "min-h-screen bg-background"}>
      <div className={isModal ? "" : "max-w-7xl mx-auto px-4 py-6 lg:px-8"}>
        {/* Header with back button */}
        {!isModal && (
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Professional Profile</h1>
          </div>
        )}

        <div className={isModal ? "grid md:grid-cols-3 gap-4" : "grid md:grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"}>
          {/* Main Profile Card */}
          <div className={isModal ? "md:col-span-2 space-y-4" : "lg:col-span-2 space-y-6"}>
            <Card className={isModal ? "shadow-sm" : ""}>
              <CardHeader className={isModal ? "p-4 pb-2" : ""}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className={isModal ? "h-14 w-14 ring-2 ring-blue-100" : "h-20 w-20 ring-2 ring-blue-100"}>
                      <AvatarImage src={professional.profile_photo_url} alt={displayName} />
                      <AvatarFallback className={isModal ? "bg-blue-50 text-blue-600 font-medium text-lg" : "bg-blue-50 text-blue-600 font-medium text-2xl"}>
                        {professional.first_name?.charAt(0) || ''}{professional.last_name?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div className={isModal ? "space-y-1" : "space-y-2"}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`${isModal ? 'text-xl' : 'text-3xl'} ${premiumStatus.isPremium ? 'font-extrabold' : 'font-bold'} text-foreground`}>
                            {displayName}
                          </h2>
                          {premiumStatus.isPremium && (
                            <div className="relative group">
                              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-1.5 py-0.5 rounded-full">
                                <Crown className="h-3 w-3" />
                                <span className="text-[10px] font-bold">PREMIUM</span>
                              </div>
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                Premium Professional
                              </div>
                            </div>
                          )}
                        </div>
                        <p className={`${isModal ? 'text-sm' : 'text-xl'} text-muted-foreground`}>{professional.title}</p>
                      </div>
                      <div className={`flex items-center gap-3 ${isModal ? 'text-xs' : 'text-sm'} text-muted-foreground flex-wrap`}>
                        <div className="flex items-center gap-1">
                          <MapPin className={isModal ? "h-3 w-3" : "h-4 w-4"} />
                          {professional.location}
                        </div>
                        {!isModal && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Member since {formatDate(professional.created_at)}
                          </div>
                        )}
                      </div>
                      <div className={isModal ? "mt-1" : "mt-2"}>
                        <RatingDisplay
                          rating={professional.average_rating || 0}
                          reviewsCount={professional.reviews_count || 0}
                          size={isModal ? "sm" : "md"}
                        />
                      </div>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <Button onClick={handleEditProfile} variant="outline" size={isModal ? "sm" : "default"}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className={isModal ? "p-4 pt-2 space-y-3" : "space-y-6"}>
                {/* Status Badges */}
                <div className={`flex flex-wrap ${isModal ? 'gap-1.5' : 'gap-2'}`}>
                  {premiumStatus.isPremium && (
                    <Badge className={`bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md ${isModal ? 'text-xs px-2 py-0.5' : ''}`}>
                      <Zap className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                      Priority Visibility
                    </Badge>
                  )}
                  <Badge variant="secondary" className={`capitalize ${isModal ? 'text-xs' : ''}`}>
                    {professional.experience_level}
                  </Badge>
                  {professional.is_self_employed && (
                    <Badge variant="outline" className={isModal ? 'text-xs' : ''}>
                      Self-Employed
                    </Badge>
                  )}
                  {professional.actively_looking && (
                    <Badge className={`bg-gradient-to-r from-green-600 to-emerald-700 text-white font-semibold shadow-md ${isModal ? 'text-xs px-2 py-0.5' : ''}`}>
                      <CheckCircle className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                      Actively Looking
                    </Badge>
                  )}
                  {!professional.actively_looking && professional.available_for_work && (
                    <Badge className={`bg-green-500 hover:bg-green-600 ${isModal ? 'text-xs px-2 py-0.5' : ''}`}>
                      <CheckCircle className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                      Available
                    </Badge>
                  )}
                </div>

                {/* Bio */}
                {professional.bio && (
                  <div>
                    <h3 className={`${isModal ? 'text-sm' : 'text-lg'} font-semibold ${isModal ? 'mb-1.5' : 'mb-3'} flex items-center gap-2`}>
                      <User className={isModal ? "h-4 w-4" : "h-5 w-5"} />
                      About
                    </h3>
                    <p className={`text-muted-foreground leading-relaxed whitespace-pre-wrap ${isModal ? 'text-xs line-clamp-3' : ''}`}>
                      {professional.bio}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {professional.skills && professional.skills.length > 0 && (
                  <div>
                    <h3 className={`${isModal ? 'text-sm' : 'text-lg'} font-semibold ${isModal ? 'mb-1.5' : 'mb-3'} flex items-center gap-2`}>
                      <Target className={isModal ? "h-4 w-4" : "h-5 w-5"} />
                      Skills & Expertise
                    </h3>
                    <div className={`flex flex-wrap ${isModal ? 'gap-1' : 'gap-2'}`}>
                      {professional.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className={isModal ? "text-xs px-2 py-0" : "text-sm"}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {professional.languages && professional.languages.length > 0 && (
                  <div>
                    <h3 className={`${isModal ? 'text-sm' : 'text-lg'} font-semibold ${isModal ? 'mb-1.5' : 'mb-3'} flex items-center gap-2`}>
                      <LanguagesIcon className={isModal ? "h-4 w-4" : "h-5 w-5"} />
                      Languages
                    </h3>
                    <div className={`flex flex-wrap ${isModal ? 'gap-1' : 'gap-2'}`}>
                      {professional.languages.map((language, index) => (
                        <Badge key={index} variant="outline" className={isModal ? "text-xs px-2 py-0" : "text-sm"}>
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(professional.ready_to_relocate || professional.has_driving_licence || professional.has_own_transport) && (
                  <div>
                    <h3 className={`${isModal ? 'text-sm' : 'text-lg'} font-semibold ${isModal ? 'mb-1.5' : 'mb-3'} flex items-center gap-2`}>
                      <FileText className={isModal ? "h-4 w-4" : "h-5 w-5"} />
                      Additional Information
                    </h3>
                    <div className={`flex flex-wrap ${isModal ? 'gap-1' : 'gap-2'}`}>
                      {professional.ready_to_relocate && (
                        <Badge variant="outline" className={isModal ? "text-xs px-2 py-0" : "text-sm"}>
                          <TrendingUp className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                          Ready to Relocate
                        </Badge>
                      )}
                      {professional.has_driving_licence && (
                        <Badge variant="outline" className={isModal ? "text-xs px-2 py-0" : "text-sm"}>
                          <CheckCircle className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                          Driving Licence
                        </Badge>
                      )}
                      {professional.has_own_transport && (
                        <Badge variant="outline" className={isModal ? "text-xs px-2 py-0" : "text-sm"}>
                          <Car className={isModal ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
                          Own Transport
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Employment Status & Availability - Compact in modal */}
                {(professional.employment_status || professional.availability) && (
                  <div>
                    <h3 className={`${isModal ? 'text-sm' : 'text-lg'} font-semibold ${isModal ? 'mb-1.5' : 'mb-3'} flex items-center gap-2`}>
                      <Briefcase className={isModal ? "h-4 w-4" : "h-5 w-5"} />
                      Employment Details
                    </h3>
                    <div className={`${isModal ? 'flex flex-wrap gap-3 text-xs' : 'space-y-2'}`}>
                      {professional.employment_status && (
                        <div className={`flex items-center gap-1 ${isModal ? '' : 'text-sm'}`}>
                          <span className="font-medium text-foreground">Status:</span>
                          <span className="text-muted-foreground capitalize">{professional.employment_status.replace('_', ' ')}</span>
                        </div>
                      )}
                      {professional.availability && (
                        <div className="flex items-center gap-1">
                          <Clock className={`${isModal ? 'h-3 w-3' : 'h-4 w-4'} text-green-600`} />
                          <span className={`${isModal ? 'text-xs' : 'text-sm'} font-medium text-green-600`}>
                            {formatAvailability(professional.availability)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Experience Level - Hide in modal since it's shown in badges */}
                {!isModal && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Experience
                    </h3>
                    <Badge variant="outline" className="text-sm capitalize">
                      {professional.experience_level} Level
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section - Hide in modal to save space */}
            {!isModal && (
              <ReviewsList
                userId={professional.user_id}
                userType="professional"
                title="Reviews"
                limit={5}
                showViewAll={true}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className={isModal ? "space-y-3" : "space-y-6"}>
            {/* Contact Card */}
            {!isOwnProfile && (
              <Card className={isModal ? "shadow-sm" : ""}>
                <CardHeader className={isModal ? "p-3 pb-2" : ""}>
                  <CardTitle className={isModal ? "text-sm" : "text-lg"}>Contact</CardTitle>
                </CardHeader>
                <CardContent className={isModal ? "p-3 pt-0 space-y-2" : "space-y-3"}>
                  {user ? (
                    <>
                      <Button
                        onClick={handleContact}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!professional.available_for_work || (userType !== "company" && userType !== "contractor")}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {userType === "company" ? "Send Inquiry" : "Send Message"}
                      </Button>
                      {!professional.available_for_work && (
                        <p className="text-sm text-muted-foreground text-center">
                          Currently not available for work
                        </p>
                      )}
                      {userType !== "company" && userType !== "contractor" && (
                        <p className="text-sm text-muted-foreground text-center">
                          Only employers and tradespeople can contact professionals
                        </p>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={handleContact}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Professional
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Links Card */}
            {(professional.portfolio_url || professional.linkedin_url || professional.github_url || professional.website_url || professional.cv_url) && (
              <Card className={isModal ? "shadow-sm" : ""}>
                <CardHeader className={isModal ? "p-3 pb-2" : ""}>
                  <CardTitle className={isModal ? "text-sm" : "text-lg"}>Links</CardTitle>
                </CardHeader>
                <CardContent className={isModal ? "p-3 pt-0 flex flex-wrap gap-1.5" : "space-y-3"}>
                  {professional.portfolio_url && (
                    <Button variant="outline" size="sm" asChild className={isModal ? "h-7 px-2 text-xs" : "w-full justify-start"}>
                      <Link href={professional.portfolio_url} target="_blank">
                        <ExternalLink className={isModal ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                        Portfolio
                      </Link>
                    </Button>
                  )}
                  {professional.linkedin_url && (
                    <Button variant="outline" size="sm" asChild className={isModal ? "h-7 px-2 text-xs" : "w-full justify-start"}>
                      <Link href={professional.linkedin_url} target="_blank">
                        <Linkedin className={isModal ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                        LinkedIn
                      </Link>
                    </Button>
                  )}
                  {professional.github_url && (
                    <Button variant="outline" size="sm" asChild className={isModal ? "h-7 px-2 text-xs" : "w-full justify-start"}>
                      <Link href={professional.github_url} target="_blank">
                        <Github className={isModal ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                        GitHub
                      </Link>
                    </Button>
                  )}
                  {professional.website_url && (
                    <Button variant="outline" size="sm" asChild className={isModal ? "h-7 px-2 text-xs" : "w-full justify-start"}>
                      <Link href={professional.website_url} target="_blank">
                        <Globe className={isModal ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                        Website
                      </Link>
                    </Button>
                  )}
                  {professional.cv_url && (
                    <Button variant="outline" size="sm" asChild className={isModal ? "h-7 px-2 text-xs" : "w-full justify-start"}>
                      <Link href={professional.cv_url} target="_blank">
                        <FileText className={isModal ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                        CV
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Info Card */}
            <Card className={isModal ? "shadow-sm" : ""}>
              <CardHeader className={isModal ? "p-3 pb-2" : ""}>
                <CardTitle className={isModal ? "text-sm" : "text-lg"}>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className={isModal ? "p-3 pt-0 space-y-1.5" : "space-y-3"}>
                <div className={`space-y-1.5 ${isModal ? 'text-xs' : 'text-sm'}`}>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="font-medium capitalize">{professional.experience_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment:</span>
                    <span className="font-medium">
                      {professional.is_self_employed ? "Self-Employed" : "Employed"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span className={`font-medium ${professional.available_for_work ? "text-green-600" : "text-red-600"}`}>
                      {professional.available_for_work
                        ? (professional.availability ? formatAvailability(professional.availability) : "Available")
                        : "Not Available"}
                    </span>
                  </div>
                  {salaryDisplay && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salary:</span>
                      <span className="font-medium text-green-600">{salaryDisplay}</span>
                    </div>
                  )}
                  {premiumStatus.isPremium && !isModal && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Crown className="h-4 w-4" />
                        <span className="font-semibold">Premium Member</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Priority support available
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Premium Features Card - Only visible for premium professionals, hide in modal */}
            {premiumStatus.isPremium && !isModal && (
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Crown className="h-5 w-5" />
                    Premium Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900">Priority Search Ranking</p>
                        <p className="text-xs text-amber-700">Appears first in search results</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900">Enhanced Visibility</p>
                        <p className="text-xs text-amber-700">Bold name and green indicator</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900">Priority Support</p>
                        <p className="text-xs text-amber-700">Fast-tracked assistance</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900">Profile Boost</p>
                        <p className="text-xs text-amber-700">More visibility to employers</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          professionalId={professional.id}
          professionalName={`${professional.first_name || ''}${professional.last_name ? ' ' + professional.last_name : ''}`}
          user={user}
        />
      )}
    </div>
  )
}