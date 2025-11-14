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
  Zap
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import { usePremiumStatus } from "@/hooks/use-premium-status"
import UserReviewsDisplay from "./user-reviews-display"

interface ProfessionalProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  title: string
  bio: string
  location: string
  latitude?: number
  longitude?: number
  experience_level: string
  skills: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  phone?: string
  salary_min?: number
  salary_max?: number
  available_for_work: boolean
  is_self_employed: boolean
  profile_photo_url?: string
  cv_url?: string
  created_at: string
}

interface User {
  id: string
  email: string
}

interface ProfessionalDetailViewProps {
  professional: ProfessionalProfile
  user: User | null
  userType: "professional" | "company" | null
}

export default function ProfessionalDetailView({ professional, user, userType }: ProfessionalDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)
  const [returnPath, setReturnPath] = useState<string | null>(null)

  const isEmployer = userType === "company"
  const isOwnProfile = user?.id === professional.user_id

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
      professionalName: `${professional.first_name} ${professional.last_name}`,
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

  const handleContact = () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    if (!isEmployer) {
      alert("Only employers can contact professionals")
      return
    }

    setShowMessageModal(true)
  }

  const handleEditProfile = () => {
    router.push("/profile/edit")
  }

  const handleBack = () => {
    // Always use router.back() first - it respects browser history
    // The fallback path will be used if navigation fails
    if (window.history.length > 1) {
      router.back()
    } else {
      // No history - use the tracked return path or default to professionals
      const fallbackPath = returnPath || '/professionals'
      router.push(fallbackPath)
    }
  }

  const nickname = `${professional.first_name} ${professional.last_name.charAt(0)}.`
  const salaryDisplay = formatSalary(professional.salary_min, professional.salary_max)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header with back button */}
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20 ring-2 ring-blue-100">
                      <AvatarImage src={professional.profile_photo_url} alt={nickname} />
                      <AvatarFallback className="bg-blue-50 text-blue-600 font-medium text-2xl">
                        {professional.first_name.charAt(0)}{professional.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`text-3xl ${premiumStatus.isPremium ? 'font-extrabold' : 'font-bold'} text-foreground`}>
                            {nickname}
                          </h2>
                          {premiumStatus.isPremium && (
                            <div className="relative group">
                              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2 py-1 rounded-full">
                                <Crown className="h-4 w-4" />
                                <span className="text-xs font-bold">PREMIUM</span>
                              </div>
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                Premium Professional
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xl text-muted-foreground">{professional.title}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {professional.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Member since {formatDate(professional.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <Button onClick={handleEditProfile} variant="outline">
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {premiumStatus.isPremium && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md">
                      <Zap className="h-3 w-3 mr-1" />
                      Priority Visibility
                    </Badge>
                  )}
                  <Badge variant="secondary" className="capitalize">
                    {professional.experience_level}
                  </Badge>
                  {professional.is_self_employed && (
                    <Badge variant="outline">
                      Self-Employed
                    </Badge>
                  )}
                  {professional.available_for_work && (
                    <Badge className={premiumStatus.isPremium ? "bg-green-600 hover:bg-green-700 shadow-md" : "bg-green-500 hover:bg-green-600"}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {premiumStatus.isPremium ? "Actively Looking" : "Available"}
                    </Badge>
                  )}
                  {salaryDisplay && (
                    <Badge variant="outline" className="text-green-600">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {salaryDisplay}
                    </Badge>
                  )}
                </div>

                {/* Bio */}
                {professional.bio && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      About
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {professional.bio}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {professional.skills && professional.skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Skills & Expertise
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {professional.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Level */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </h3>
                  <Badge variant="outline" className="text-sm capitalize">
                    {professional.experience_level} Level
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <UserReviewsDisplay userId={professional.user_id} showStats={true} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            {!isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEmployer ? (
                    <Button
                      onClick={handleContact}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!professional.available_for_work}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Inquiry
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push("/auth/login")}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Professional
                    </Button>
                  )}
                  {!professional.available_for_work && (
                    <p className="text-sm text-muted-foreground text-center">
                      Currently not available for work
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Links Card */}
            {(professional.portfolio_url || professional.linkedin_url || professional.github_url || professional.website_url || professional.cv_url) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {professional.portfolio_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={professional.portfolio_url} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Portfolio
                      </Link>
                    </Button>
                  )}
                  {professional.linkedin_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={professional.linkedin_url} target="_blank">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Link>
                    </Button>
                  )}
                  {professional.github_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={professional.github_url} target="_blank">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Link>
                    </Button>
                  )}
                  {professional.website_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={professional.website_url} target="_blank">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Link>
                    </Button>
                  )}
                  {professional.cv_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={professional.cv_url} target="_blank">
                        <FileText className="h-4 w-4 mr-2" />
                        View CV/Resume
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
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
                      {professional.available_for_work ? "Available" : "Not Available"}
                    </span>
                  </div>
                  {salaryDisplay && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salary:</span>
                      <span className="font-medium text-green-600">{salaryDisplay}</span>
                    </div>
                  )}
                  {premiumStatus.isPremium && (
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

            {/* Premium Features Card - Only visible for premium professionals */}
            {premiumStatus.isPremium && (
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
          professionalName={`${professional.first_name} ${professional.last_name}`}
          user={user}
        />
      )}
    </div>
  )
}