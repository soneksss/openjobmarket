"use client"

// Fixed double modal issue by removing internal Dialog wrapper
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Info, Send, Eye, EyeOff, User, Mail, Phone, MapPin, FileText, Plus, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Job {
  id: string
  title: string
  is_tradespeople_job?: boolean
  company_profiles?: {
    id: string
    company_name: string
    user_id: string
  }
  homeowner_profiles?: {
    id: string
    first_name: string
    last_name: string
    user_id: string
  }
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  title: string
  location: string
  skills: string[]
  spoken_languages?: string[]
  bio: string
  email?: string
  phone?: string
  full_address?: string
  nickname?: string
  hide_email?: boolean
  hide_personal_name?: boolean
}

interface JobApplicationFormProps {
  job: Job
  userProfile: UserProfile
  hasApplied: boolean
  onApplicationSubmitted: () => void
  onClose?: () => void
}

export default function JobApplicationForm({
  job,
  userProfile,
  hasApplied,
  onApplicationSubmitted,
  onClose,
}: JobApplicationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [sharePersonalInfo, setSharePersonalInfo] = useState(true)
  const [attachCV, setAttachCV] = useState(true)
  const [hasCV, setHasCV] = useState(false)
  const [checkingCV, setCheckingCV] = useState(true)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isCompany, setIsCompany] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [freshProfile, setFreshProfile] = useState<UserProfile>(userProfile)
  const [applicationLimit, setApplicationLimit] = useState<{
    can_apply: boolean
    unlimited: boolean
    applications_used: number
    applications_limit: number | null
    applications_remaining: number | null
    reset_date?: string
  } | null>(null)

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

  const getPosterUserId = () => {
    return job.company_profiles?.user_id || job.homeowner_profiles?.user_id
  }

  // Re-fetch profile data when modal opens to ensure fresh data
  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch user type from users table
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle()

        if (userData) {
          setUserType(userData.user_type)
          console.log("[JOB-APPLICATION] User type fetched:", userData.user_type)

          // Fetch fresh profile data based on user type
          let profile: any = null

          if (userData.user_type === 'professional') {
            const { data } = await supabase
              .from("professional_profiles")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle()
            profile = data
          } else if (userData.user_type === 'company') {
            const { data } = await supabase
              .from("company_profiles")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle()
            if (data) {
              // Map company fields to common profile structure
              profile = {
                first_name: data.company_name,
                last_name: '',
                nickname: data.company_name,
                title: data.industry || 'Company',
                location: data.location,
                full_address: data.full_address,
                email: user.email,
                phone: data.phone,
                bio: data.description,
                skills: data.services || [],
                spoken_languages: data.spoken_languages || [],
                hide_email: false
              }
            }
          } else if (userData.user_type === 'contractor') {
            const { data } = await supabase
              .from("contractor_profiles")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle()
            if (data) {
              // Map contractor fields to common profile structure
              profile = {
                first_name: data.company_name,
                last_name: '',
                nickname: data.company_name,
                title: data.industry || 'Contractor',
                location: data.location,
                full_address: data.full_address,
                email: user.email,
                phone: data.phone,
                bio: data.bio,
                skills: data.services || [],
                spoken_languages: data.languages || [],
                hide_email: false
              }
            }
          }

          if (profile) {
            setFreshProfile({
              ...profile,
              email: user.email || profile.email || "",
              phone: profile.phone
            })
            console.log("[JOB-APPLICATION] Fresh profile data loaded:", {
              location: profile.location,
              title: profile.title,
              full_address: profile.full_address,
              skills: profile.skills,
              spoken_languages: profile.spoken_languages
            })
          }
        }
      } catch (error) {
        console.error("[JOB-APPLICATION] Error fetching fresh profile:", error)
      }
    }

    fetchFreshProfile()
    checkCVAvailability()
    checkApplicationLimit()
  }, [])

  const checkApplicationLimit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Only check for professionals/homeowners, not companies or contractors
      // Note: userType state is set by fetchFreshProfile, so we check directly from DB here
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle()

      if (userData?.user_type === 'company' || userData?.user_type === 'contractor') {
        console.log("[APPLICATION-LIMIT] Skipping limit check for company/contractor")
        return
      }

      const { data: limitData, error } = await supabase
        .rpc('can_submit_application', { user_id_param: user.id })

      if (error) {
        console.error("[APPLICATION-LIMIT] Error checking limit:", error)
      } else if (limitData) {
        setApplicationLimit(limitData)
        console.log("[APPLICATION-LIMIT] Limit data loaded:", limitData)
      }
    } catch (error) {
      console.error("[APPLICATION-LIMIT] Exception checking limit:", error)
    }
  }

  const checkCVAvailability = async () => {
    setCheckingCV(true)
    try {
      // Companies and contractors don't have CVs, only professionals do
      // We need to check the user type from the DB since userType state might not be set yet
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasCV(false)
        setCheckingCV(false)
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle()

      const isCompanyOrContractor = userData?.user_type === 'company' || userData?.user_type === 'contractor'
      setIsCompany(isCompanyOrContractor)

      if (isCompanyOrContractor) {
        console.log("[JOB-APPLICATION] Company/Contractor applicant - skipping CV check, user_type:", userData?.user_type)
        setHasCV(false)
        setCheckingCV(false)
        return
      }

      const { data: cvRecord } = await supabase
        .from("professional_cvs")
        .select("id")
        .eq("professional_id", userProfile.id)
        .maybeSingle()

      setHasCV(!!cvRecord)
    } catch (error) {
      console.log("No CV found for user")
      setHasCV(false)
    } finally {
      setCheckingCV(false)
    }
  }

  // User is authenticated (userProfile is passed as prop)
  // Show the application form directly

  const handleApply = async () => {
    // Prevent double submission
    if (loading) {
      console.log("[v0] Application already in progress, ignoring duplicate click")
      return
    }

    // CRITICAL: Block Individual accounts (homeowner, professional) from applying to ANY jobs
    // New simplified model: Only Business accounts (company, contractor) can apply for jobs
    if (userType === 'professional' || userType === 'homeowner') {
      console.error("[JOB-APPLICATION] BLOCKED: Individual account '" + userType + "' cannot apply to jobs")
      setSubmissionError(
        "Only business accounts can apply for jobs. Individual accounts (homeowners and jobseekers) can post jobs to find services but cannot apply to jobs posted by others."
      )
      return
    }

    // CRITICAL: Prevent users from applying to their own jobs
    const posterUserId = getPosterUserId()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && posterUserId === user.id) {
      console.error("[JOB-APPLICATION] BLOCKED: User attempting to apply to their own job")
      setSubmissionError(
        "You cannot apply to your own job posting. This job was posted by you."
      )
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Starting job application process")
      console.log("[v0] Job ID:", job.id)
      console.log("[v0] Job is Trade Job:", job.is_tradespeople_job)
      console.log("[v0] User type:", userType)

      // Detect if this is a company or professional applying based on userType state
      // Using userType is more reliable than checking for company_name property
      const isCompanyApplicant = userType === 'company' || userType === 'contractor'
      console.log("[v0] Applicant type:", isCompanyApplicant ? "Company/Contractor" : "Professional", "| User type:", userType)
      console.log("[v0] Applicant ID:", userProfile.id)
      console.log("[v0] Cover letter length:", coverLetter?.length || 0)
      console.log("[v0] Share personal info:", sharePersonalInfo)
      console.log("[v0] Attach CV:", attachCV, "| Has CV:", hasCV)

      // Check application limit (only for professionals/homeowners, not companies)
      if (!isCompanyApplicant) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log("[APPLICATION-LIMIT] Checking application limit for user:", user.id)

          const { data: limitCheck, error: limitError } = await supabase
            .rpc('can_submit_application', { user_id_param: user.id })

          if (limitError) {
            console.error("[APPLICATION-LIMIT] Error checking limit:", limitError)
          } else if (limitCheck && !limitCheck.can_apply) {
            console.log("[APPLICATION-LIMIT] Application limit reached:", limitCheck)

            const resetDate = limitCheck.reset_date
              ? new Date(limitCheck.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'next month'

            setSubmissionError(
              `You've reached your monthly application limit (${limitCheck.applications_used}/${limitCheck.applications_limit}). ` +
              `Upgrade to Premium for unlimited applications, or wait until ${resetDate} when your limit resets.`
            )
            setTimeout(() => setSubmissionError(null), 8000)
            setLoading(false)
            return
          } else {
            console.log("[APPLICATION-LIMIT] Application allowed:", limitCheck)
          }
        }
      }

      if (isCompanyApplicant) {
        // Trade job apply — route through the shared apply_to_job() RPC (the
        // same endpoint urgent-job-apply-section.tsx uses) instead of inserting
        // into job_applications directly, so dispatch tracking, the FILLED
        // response cap, and the homeowner notification all fire consistently.
        const res = await fetch(`/api/jobs/${job.id}/urgent-responses`, {
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          credentials: "include",
          body:        JSON.stringify({ message: coverLetter || undefined }),
        })
        const data = await res.json().catch(() => null)

        if (res.status === 409 && data?.error?.toLowerCase().includes("already")) {
          console.log("[v0] Duplicate application detected, aborting")
          setSubmissionError("You have already applied for this job.")
          setTimeout(() => setSubmissionError(null), 5000)
          setLoading(false)
          return
        }
        if (!res.ok) {
          throw new Error(data?.error || "Failed to submit application")
        }

        console.log("[v0] Application submitted successfully via apply_to_job")
      } else {
        // Check for duplicate application
        const duplicateCheck = await supabase
          .from("job_applications")
          .select("id")
          .eq("job_id", job.id)
          .eq("professional_id", userProfile.id)
          .maybeSingle()

        console.log("[v0] Duplicate check using field: professional_id value:", userProfile.id)

        if (duplicateCheck.data) {
          console.log("[v0] Duplicate application detected, aborting")
          setSubmissionError("You have already applied for this job.")
          setTimeout(() => setSubmissionError(null), 5000)
          setLoading(false)
          return
        }

        // Build application data
        const applicationData: any = {
          job_id: job.id,
          cover_letter: coverLetter || null,
          status: "PENDING",
          professional_id: userProfile.id,
        }

        // Record CV attachment status for professionals
        if (attachCV && hasCV) {
          // Fetch the CV source (builder or upload) from professional_profiles
          const { data: profileData } = await supabase
            .from("professional_profiles")
            .select("cv_source")
            .eq("id", userProfile.id)
            .maybeSingle()

          applicationData.cv_type_used = profileData?.cv_source || 'builder'
          console.log("[v0] CV will be attached. Type:", applicationData.cv_type_used)
        } else {
          applicationData.cv_type_used = 'none'
          console.log("[v0] CV will NOT be attached")
        }

        console.log("[v0] Application data to insert:", applicationData)

        // Submit the application
        const { data: applicationResult, error: applicationError } = await supabase
          .from("job_applications")
          .insert(applicationData)
          .select("id")
          .single()

        if (applicationError) {
          console.error("[v0] Application error:", applicationError)
          throw applicationError
        }

        console.log("[v0] Application submitted successfully")

        // Send email notification to job poster (non-blocking)
        const posterUserId = getPosterUserId()
        if (posterUserId && applicationResult) {
          fetch("/api/notifications/send-application-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobPosterId: posterUserId,
              applicantId: user!.id,
              jobId: job.id,
              jobTitle: job.title,
              applicationId: applicationResult.id,
              applicationMessage: coverLetter || undefined,
            }),
          }).catch((err) => {
            console.error("[v0] Failed to send application email notification:", err)
            // Don't block user flow on notification failure
          })
        }

        // Increment application counter
        const { data: { user: counterUser } } = await supabase.auth.getUser()
        if (counterUser) {
          console.log("[APPLICATION-LIMIT] Incrementing application counter for user:", counterUser.id)

          const { data: incrementResult, error: incrementError } = await supabase
            .rpc('increment_application_counter', { user_id_param: counterUser.id })

          if (incrementError) {
            console.error("[APPLICATION-LIMIT] Error incrementing counter:", incrementError)
          } else {
            console.log("[APPLICATION-LIMIT] Counter incremented:", incrementResult)
          }
        }
      }

      // If user chose to share personal info, create privacy permission (only for professional applicants)
      if (sharePersonalInfo && !isCompanyApplicant) {
        const employerUserId = getPosterUserId()
        console.log("[JOB-APPLICATION] User chose to share personal info")
        console.log("[JOB-APPLICATION] Creating privacy permission with:")
        console.log("[JOB-APPLICATION] - Professional ID (from userProfile):", userProfile.id)
        console.log("[JOB-APPLICATION] - Employer User ID:", employerUserId)

        const permissionData = {
          professional_id: userProfile.id, // Use profile ID, not user_id
          employer_id: employerUserId,
          can_see_personal_info: true,
          granted_at: new Date().toISOString(),
        }
        console.log("[JOB-APPLICATION] Permission data to upsert:", JSON.stringify(permissionData, null, 2))

        const { data: permissionResult, error: privacyError } = await supabase
          .from("employer_privacy_permissions")
          .upsert(permissionData, {
            onConflict: 'professional_id,employer_id'
          })
          .select()

        if (privacyError) {
          console.error("[JOB-APPLICATION] Failed to create privacy permission:", privacyError)
        } else {
          console.log("[JOB-APPLICATION] Privacy permission created successfully:", permissionResult)
        }
      } else if (sharePersonalInfo && isCompanyApplicant) {
        console.log("[JOB-APPLICATION] Company applicant - skipping privacy permission (not applicable)")
      } else {
        console.log("[JOB-APPLICATION] User chose NOT to share personal info")
      }

      console.log("[v0] Resetting form state")
      setCoverLetter("")
      setSharePersonalInfo(false)
      setAttachCV(true) // Reset to default (checked)
      onApplicationSubmitted()
      onClose?.()
      console.log("[v0] Job application process completed successfully")

      // Show success message using window notification (better than alert)
      setSubmissionSuccess(true)
      setTimeout(() => setSubmissionSuccess(false), 5000)
    } catch (error) {
      console.error("[v0] Error applying to job:", error)
      setSubmissionError("Failed to submit application. Please try again.")
      setTimeout(() => setSubmissionError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const getVisibleInfo = () => {
    // Handle cases where profile might not be fully loaded
    const firstName = freshProfile?.first_name || ''
    const lastName = freshProfile?.last_name || ''
    const nickname = freshProfile?.nickname

    // Build display name safely
    const buildName = () => {
      if (sharePersonalInfo) {
        return `${firstName} ${lastName}`.trim() || 'Name not available'
      }
      // Nickname mode
      if (nickname) return nickname
      if (firstName && lastName) {
        return `${firstName} ${lastName[0]}.`
      }
      if (firstName) return firstName
      return 'Anonymous'
    }

    if (sharePersonalInfo) {
      return {
        name: buildName(),
        email: freshProfile?.hide_email ? "Hidden (privacy setting)" : (freshProfile?.email || "Email not in profile"),
        phone: freshProfile?.phone || "Phone not in profile",
        address: freshProfile?.full_address || freshProfile?.location || "Location not in profile",
        title: freshProfile?.title || "Title not in profile",
        bio: freshProfile?.bio,
        skills: freshProfile?.skills,
        spoken_languages: freshProfile?.spoken_languages,
      }
    } else {
      return {
        name: buildName(),
        email: "Hidden (nickname mode)",
        phone: "Hidden (nickname mode)",
        address: freshProfile?.location || "Location not in profile",
        title: freshProfile?.title || "Title not in profile",
        bio: freshProfile?.bio,
        skills: freshProfile?.skills,
        spoken_languages: freshProfile?.spoken_languages,
      }
    }
  }

  const visibleInfo = getVisibleInfo()

  if (hasApplied) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Send className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Application Submitted</h3>
          <p className="text-muted-foreground">
            You have already applied for this position. The user will review your application and get back to you.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm font-medium text-gray-700">Submitting your application...</p>
          </div>
        </div>
      )}

      <div className="space-y-6 mt-4">
              {/* Application Limit Warning */}
              {!isCompany && applicationLimit && !applicationLimit.unlimited && (
                <Card className={`border-2 ${
                  applicationLimit.applications_remaining === 0
                    ? 'border-red-300 bg-red-50'
                    : (applicationLimit.applications_remaining || 0) <= 2
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-blue-300 bg-blue-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        applicationLimit.applications_remaining === 0
                          ? 'text-red-600'
                          : (applicationLimit.applications_remaining || 0) <= 2
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${
                          applicationLimit.applications_remaining === 0
                            ? 'text-red-900'
                            : (applicationLimit.applications_remaining || 0) <= 2
                            ? 'text-amber-900'
                            : 'text-blue-900'
                        }`}>
                          {applicationLimit.applications_remaining === 0
                            ? 'Application Limit Reached'
                            : `${applicationLimit.applications_remaining} Applications Remaining`}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          applicationLimit.applications_remaining === 0
                            ? 'text-red-800'
                            : (applicationLimit.applications_remaining || 0) <= 2
                            ? 'text-amber-800'
                            : 'text-blue-800'
                        }`}>
                          You've used {applicationLimit.applications_used} of {applicationLimit.applications_limit} applications this month.
                          {applicationLimit.reset_date && ` Resets ${new Date(applicationLimit.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
                        </p>
                        {(applicationLimit.applications_remaining || 0) <= 2 && (
                          <Link
                            href="/dashboard/professional/subscription"
                            className={`text-sm font-medium inline-flex items-center mt-2 ${
                              applicationLimit.applications_remaining === 0
                                ? 'text-red-700 hover:text-red-800'
                                : 'text-amber-700 hover:text-amber-800'
                            }`}
                          >
                            Upgrade to Premium for unlimited applications →
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Privacy Control Section - Hidden for companies */}
              {!isCompany && (
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-blue-600" />
                      Privacy & Information Sharing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
                    sharePersonalInfo
                      ? 'bg-green-50 border-green-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}>
                    <Checkbox
                      id="sharePersonalInfo"
                      checked={sharePersonalInfo}
                      onCheckedChange={(checked) => setSharePersonalInfo(checked as boolean)}
                      className="h-6 w-6 mt-1 bg-white border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="sharePersonalInfo" className="text-base font-semibold cursor-pointer text-gray-900">
                        I agree to share my personal contact information with this User
                      </Label>
                    </div>
                  </div>

                  {/* Information Preview */}
                  <div className="mt-4 p-4 bg-white border rounded-lg">
                    <div className="flex items-center mb-3">
                      {sharePersonalInfo ? (
                        <Eye className="h-4 w-4 text-green-600 mr-2" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-500 mr-2" />
                      )}
                      <span className="text-sm font-medium">What {getPosterName()} will see:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{visibleInfo.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className={`font-medium ${!sharePersonalInfo ? "text-gray-400" : ""}`}>
                          {visibleInfo.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className={`font-medium break-all ${!sharePersonalInfo ? "text-gray-400" : ""}`}>
                          {visibleInfo.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{visibleInfo.address}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="mb-2">
                        <span className="text-sm text-muted-foreground">Professional Title:</span>
                        <span className="ml-2 font-medium">{visibleInfo.title}</span>
                      </div>
                      {visibleInfo.skills && visibleInfo.skills.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-muted-foreground">Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {visibleInfo.skills.slice(0, 5).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {visibleInfo.skills.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{visibleInfo.skills.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {visibleInfo.spoken_languages && visibleInfo.spoken_languages.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-muted-foreground">Languages:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {visibleInfo.spoken_languages.slice(0, 5).map((language) => (
                              <Badge key={language} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                {language}
                              </Badge>
                            ))}
                            {visibleInfo.spoken_languages.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{visibleInfo.spoken_languages.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {visibleInfo.bio && (
                        <div>
                          <span className="text-sm text-muted-foreground">Bio:</span>
                          <p className="text-sm mt-1 text-gray-700 line-clamp-2">{visibleInfo.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* CV Attachment Section - Only for professionals with CV */}
              {!isCompany && hasCV && (
                <Card className="border-2 border-green-200 bg-green-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-green-600" />
                      Attach CV
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
                      attachCV
                        ? 'bg-green-100 border-green-400'
                        : 'bg-white border-gray-300'
                    }`}>
                      <Checkbox
                        id="attachCV"
                        checked={attachCV}
                        onCheckedChange={(checked) => setAttachCV(checked as boolean)}
                        className="h-6 w-6 mt-1 bg-white border-2 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <div className="flex-1">
                        <Label htmlFor="attachCV" className="text-base font-semibold cursor-pointer text-gray-900 flex items-center gap-2">
                          Attach my CV to this application
                          {attachCV && (
                            <Badge variant="default" className="bg-green-600 text-white text-xs">
                              ✓ CV will be attached
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your CV will be shared with the employer to help them better understand your qualifications and experience.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cover Letter Section */}
              <Card className="border-2 border-gray-200 bg-gray-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-600" />
                    Cover Letter (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the employer why you're interested in this role and what makes you a great fit..."
                    rows={6}
                    className="resize-none bg-white border-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    A personalized cover letter can help you stand out from other applicants.
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={loading} className="min-w-[140px]">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </div>

      {/* Success Notification */}
        {submissionSuccess && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
            <Card className="border-2 border-green-500 bg-green-50 shadow-lg max-w-md">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-900">Application Submitted Successfully!</h3>
                    <p className="text-sm text-green-800 mt-1">The employer will review your application and get back to you.</p>
                  </div>
                  <button
                    onClick={() => setSubmissionSuccess(false)}
                    className="flex-shrink-0 text-green-700 hover:text-green-900"
                  >
                    <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Notification */}
        {submissionError && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
            <Card className="border-2 border-red-500 bg-red-50 shadow-lg max-w-md">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900">Application Failed</h3>
                    <p className="text-sm text-red-800 mt-1">{submissionError}</p>
                  </div>
                  <button
                    onClick={() => setSubmissionError(null)}
                    className="flex-shrink-0 text-red-700 hover:text-red-900"
                  >
                    <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </>
  )
}
