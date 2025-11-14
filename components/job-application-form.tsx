"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Shield, Info, Send, Eye, EyeOff, User, Mail, Phone, MapPin, FileText, Plus, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Job {
  id: string
  title: string
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
}

export default function JobApplicationForm({
  job,
  userProfile,
  hasApplied,
  onApplicationSubmitted,
}: JobApplicationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [sharePersonalInfo, setSharePersonalInfo] = useState(true)
  const [attachCV, setAttachCV] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasCV, setHasCV] = useState(false)
  const [checkingCV, setCheckingCV] = useState(true)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isCompany, setIsCompany] = useState(false)

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

  useEffect(() => {
    // Since userProfile is passed as prop, we know user is authenticated
    // Just check CV availability
    console.log("[JOB-APPLICATION] User is authenticated via props, checking CV availability...")
    checkCVAvailability()
  }, [])

  const checkCVAvailability = async () => {
    setCheckingCV(true)
    try {
      // Companies don't have CVs, only professionals do
      const isCompanyApplicant = !!(userProfile as any).company_name
      setIsCompany(isCompanyApplicant)

      if (isCompanyApplicant) {
        console.log("[JOB-APPLICATION] Company applicant - skipping CV check")
        setHasCV(false)
        setCheckingCV(false)
        return
      }

      const { data: cvRecord } = await supabase
        .from("professional_cvs")
        .select("id")
        .eq("professional_id", userProfile.id)
        .single()

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

    setLoading(true)
    try {
      console.log("[v0] Starting job application process")
      console.log("[v0] Job ID:", job.id)

      // Detect if this is a company or professional applying
      // Company profiles have company_name, professional profiles don't
      const isCompanyApplicant = !!(userProfile as any).company_name
      console.log("[v0] Applicant type:", isCompanyApplicant ? "Company" : "Professional")
      console.log("[v0] Applicant ID:", userProfile.id)
      console.log("[v0] Cover letter length:", coverLetter?.length || 0)
      console.log("[v0] Share personal info:", sharePersonalInfo)
      console.log("[v0] Attach CV (UI only):", attachCV)

      // Check for duplicate application
      const duplicateCheck = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", job.id)
        .eq(isCompanyApplicant ? "company_id" : "professional_id", userProfile.id)
        .maybeSingle()

      if (duplicateCheck.data) {
        console.log("[v0] Duplicate application detected, aborting")
        setSubmissionError("You have already applied for this job.")
        setTimeout(() => setSubmissionError(null), 5000)
        setLoading(false)
        return
      }

      // Build application data with correct applicant ID field
      const applicationData: any = {
        job_id: job.id,
        cover_letter: coverLetter || null,
        status: "pending",
      }

      // Use company_id for company applicants, professional_id for professional applicants
      if (isCompanyApplicant) {
        applicationData.company_id = userProfile.id
      } else {
        applicationData.professional_id = userProfile.id
      }

      console.log("[v0] Application data to insert:", applicationData)

      // Submit the application
      const { error: applicationError } = await supabase.from("job_applications").insert(applicationData)

      if (applicationError) {
        console.error("[v0] Application error:", applicationError)
        throw applicationError
      }

      console.log("[v0] Application submitted successfully")

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
      setIsDialogOpen(false)
      setCoverLetter("")
      setSharePersonalInfo(false)
      setAttachCV(false)
      onApplicationSubmitted()
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
    if (sharePersonalInfo) {
      return {
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        email: userProfile.hide_email ? "Hidden (privacy setting)" : (userProfile.email || "Email not in profile"),
        phone: userProfile.phone || "Phone not in profile",
        address: userProfile.full_address || userProfile.location,
        title: userProfile.title,
        bio: userProfile.bio,
        skills: userProfile.skills,
      }
    } else {
      return {
        name: userProfile.nickname || `${userProfile.first_name} ${userProfile.last_name[0]}.`,
        email: "Hidden (nickname mode)",
        phone: "Hidden (nickname mode)",
        address: userProfile.location, // General location is always visible
        title: userProfile.title,
        bio: userProfile.bio,
        skills: userProfile.skills,
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Send className="h-5 w-5 mr-2" />
          Apply for this Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Apply Now
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium text-gray-700">Submitting your application...</p>
                </div>
              </div>
            )}

            <DialogHeader>
              <DialogTitle>Apply for {job.title}</DialogTitle>
              <DialogDescription>Submit your application to {getPosterName()}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
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
                      <div className="flex items-start space-x-2 mt-3 text-sm text-gray-700">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                        <p>
                          {sharePersonalInfo
                            ? "Your full name, email, phone, and address will be visible to this User (respecting your individual privacy settings in your profile)."
                            : "By default, users see your professional profile with nickname/initials. Your real name, phone, email, and full address remain private."}
                        </p>
                      </div>
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                        <strong>💡 Tip:</strong> Revealing your personal information increases the chance of being hired.
                      </div>
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

              {/* Cover Letter Section */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the user why you're interested in this role and what makes you a great fit..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  A personalized cover letter can help you stand out from other applicants.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
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
          </DialogContent>
        </Dialog>

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
      </CardContent>
    </Card>
  )
}
