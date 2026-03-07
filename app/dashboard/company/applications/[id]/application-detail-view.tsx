"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  Eye,
  User,
  Phone,
  Building2,
  Globe,
  Users,
  ArrowLeft,
  MessageCircle,
  Star,
  Trash2,
  ExternalLink,
  Linkedin,
  Github,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { CVDialog } from "@/components/cv-dialog"

interface Application {
  id: string
  status: string
  applied_at: string
  cover_letter?: string
  professional_id?: string | null
  company_id?: string | null
  jobs: {
    id: string
    title: string
  }
  professional_profiles?: {
    id: string
    first_name: string
    last_name: string
    title: string
    location: string
    skills: string[]
    experience_level: string
    portfolio_url?: string
    linkedin_url?: string
    github_url?: string
    user_id?: string
    phone?: string
    profile_photo_url?: string | null
    hide_email?: boolean
  } | null
  company_profiles?: {
    id: string
    company_name: string
    industry: string
    location: string
    logo_url?: string
    user_id?: string
    company_size?: string
    website?: string
  } | null
}

interface CVData {
  id?: string
  summary: string
  citizenship?: string
  workPermitStatus?: string
  hasDrivingLicense?: boolean
  workExperience: {
    id?: string
    jobTitle: string
    companyName: string
    location: string
    startDate: string
    endDate: string
    isCurrent: boolean
    responsibilities: string[]
    achievements: string[]
  }[]
  education: {
    id?: string
    institutionName: string
    degreeTitle: string
    fieldOfStudy: string
    location: string
    startDate: string
    endDate: string
    isOngoing: boolean
    gradeGpa: string
    description: string
  }[]
  skills: {
    id?: string
    skillName: string
    category: string
    proficiencyLevel: string
    yearsExperience?: number
  }[]
  languages: {
    id?: string
    languageName: string
    proficiencyLevel: string
    certification: string
  }[]
  certifications: {
    id?: string
    certificationName: string
    issuingOrganization: string
    issueDate: string
    expiryDate: string
    credentialId: string
    credentialUrl: string
    description: string
  }[]
  projects: {
    id?: string
    projectName: string
    description: string
    technologiesUsed: string[]
    projectUrl: string
    startDate: string
    endDate: string
    isOngoing: boolean
    role: string
  }[]
}

interface Props {
  application: Application
  companyProfile: { id: string; company_name: string }
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800",
  reviewed: "bg-blue-100 text-blue-800",
  interview: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

export default function ApplicationDetailView({ application: initial, companyProfile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [application, setApplication] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loadingCV, setLoadingCV] = useState(false)
  const [showCVDialog, setShowCVDialog] = useState(false)
  const [selectedProfessionalData, setSelectedProfessionalData] = useState<{
    displayEmail: string
    displayPhone: string
    displayAddress: string
    professionalTitle: string
    profilePhotoUrl: string | null
    canSeeEmail: boolean
    hasPrivacyPermission: boolean
  } | null>(null)

  const isCompanyApplicant = !!application.company_id && !!application.company_profiles
  const isProfessionalApplicant = !!application.professional_id && !!application.professional_profiles

  const displayName = isCompanyApplicant
    ? application.company_profiles!.company_name
    : isProfessionalApplicant
    ? `${application.professional_profiles!.first_name} ${application.professional_profiles!.last_name}`
    : "Unknown Applicant"

  const displayTitle = isCompanyApplicant
    ? application.company_profiles!.industry
    : isProfessionalApplicant
    ? application.professional_profiles!.title
    : ""

  const displayLocation = isCompanyApplicant
    ? application.company_profiles!.location
    : isProfessionalApplicant
    ? application.professional_profiles!.location
    : "Location not specified"

  const displayInitials = isCompanyApplicant
    ? application.company_profiles!.company_name.substring(0, 2).toUpperCase()
    : isProfessionalApplicant
    ? `${application.professional_profiles!.first_name[0]}${application.professional_profiles!.last_name[0]}`
    : "?"

  const profileUrl = isProfessionalApplicant && application.professional_profiles?.user_id
    ? `/professional/${application.professional_profiles.user_id}`
    : isCompanyApplicant && application.company_profiles?.user_id
    ? `/company/${application.company_profiles.user_id}`
    : "#"

  const messageUrl = isProfessionalApplicant
    ? `/messages?user=${application.professional_profiles?.user_id}`
    : `/messages?user=${application.company_profiles?.user_id}`

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", application.id)
      if (error) throw error
      setApplication((prev) => ({ ...prev, status: newStatus }))
    } catch (err) {
      console.error("Error updating status:", err)
      alert("Failed to update status")
    } finally {
      setLoading(false)
    }
  }

  const deleteApplication = async () => {
    if (!confirm(`Delete application from ${displayName}? This cannot be undone.`)) return
    setLoading(true)
    try {
      const { error } = await supabase.from("job_applications").delete().eq("id", application.id)
      if (error) throw error
      router.push("/dashboard/company/applications")
    } catch (err) {
      console.error("Error deleting application:", err)
      alert("Failed to delete application")
      setLoading(false)
    }
  }

  const loadCV = async () => {
    if (!isProfessionalApplicant || !application.professional_profiles) return
    setLoadingCV(true)
    setShowCVDialog(true)

    try {
      const { data: prof } = await supabase
        .from("professional_profiles")
        .select(`*, users!inner(email)`)
        .eq("id", application.professional_profiles.id)
        .single()

      if (prof) {
        setSelectedProfessionalData({
          displayEmail: prof.hide_email ? "" : (prof as any).users.email,
          displayPhone: prof.phone || "",
          displayAddress: prof.location || "",
          professionalTitle: prof.title || "",
          profilePhotoUrl: prof.profile_photo_url || null,
          canSeeEmail: !prof.hide_email,
          hasPrivacyPermission: true,
        })
      }

      const { data: cvRecord } = await supabase
        .from("professional_cvs")
        .select("*")
        .eq("professional_id", application.professional_profiles.id)
        .single()

      if (cvRecord) {
        const [workExp, education, skills, languages, certifications, projects] = await Promise.all([
          supabase.from("cv_work_experience").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_education").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_skills").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_languages").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_certifications").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_projects").select("*").eq("cv_id", cvRecord.id).order("display_order"),
        ])

        setCvData({
          id: cvRecord.id,
          summary: cvRecord.summary || "",
          citizenship: cvRecord.citizenship || undefined,
          workPermitStatus: cvRecord.work_permit_status || undefined,
          hasDrivingLicense: cvRecord.has_driving_license || undefined,
          workExperience: workExp.data?.map((e) => ({
            id: e.id, jobTitle: e.job_title, companyName: e.company_name, location: e.location || "",
            startDate: e.start_date, endDate: e.end_date || "", isCurrent: e.is_current,
            responsibilities: e.responsibilities || [], achievements: e.achievements || [],
          })) || [],
          education: education.data?.map((e) => ({
            id: e.id, institutionName: e.institution_name, degreeTitle: e.degree_title,
            fieldOfStudy: e.field_of_study || "", location: e.location || "",
            startDate: e.start_date || "", endDate: e.end_date || "", isOngoing: e.is_ongoing,
            gradeGpa: e.grade_gpa || "", description: e.description || "",
          })) || [],
          skills: skills.data?.map((s) => ({
            id: s.id, skillName: s.skill_name, category: s.category || "",
            proficiencyLevel: s.proficiency_level || "", yearsExperience: s.years_experience,
          })) || [],
          languages: languages.data?.map((l) => ({
            id: l.id, languageName: l.language_name, proficiencyLevel: l.proficiency_level,
            certification: l.certification || "",
          })) || [],
          certifications: certifications.data?.map((c) => ({
            id: c.id, certificationName: c.certification_name, issuingOrganization: c.issuing_organization,
            issueDate: c.issue_date || "", expiryDate: c.expiry_date || "",
            credentialId: c.credential_id || "", credentialUrl: c.credential_url || "",
            description: c.description || "",
          })) || [],
          projects: projects.data?.map((p) => ({
            id: p.id, projectName: p.project_name, description: p.description,
            technologiesUsed: p.technologies_used || [], projectUrl: p.project_url || "",
            startDate: p.start_date || "", endDate: p.end_date || "",
            isOngoing: p.is_ongoing, role: p.role || "",
          })) || [],
        })
      } else {
        setCvData(null)
      }
    } catch (err) {
      console.error("Error loading CV:", err)
      setCvData(null)
    } finally {
      setLoadingCV(false)
    }
  }

  const experienceLevelLabel: Record<string, string> = {
    entry: "Entry Level",
    junior: "Junior",
    mid: "Mid Level",
    senior: "Senior",
    lead: "Lead / Principal",
  }

  return (
    <div className="min-h-screen bg-slate-900 md:bg-gray-50">
      <div className="container mx-auto px-4 py-4 max-w-3xl">
        {/* Back navigation */}
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild className="text-slate-400 md:text-gray-600 hover:text-white md:hover:text-gray-900 -ml-2">
            <Link href="/dashboard/company/applications">
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Applications
            </Link>
          </Button>
        </div>

        {/* Header */}
        <Card className="mb-4 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 flex-shrink-0">
                {isProfessionalApplicant && application.professional_profiles?.profile_photo_url && (
                  <AvatarImage src={application.professional_profiles.profile_photo_url} alt={displayName} />
                )}
                <AvatarFallback className="text-lg bg-emerald-900/50 md:bg-blue-100 text-emerald-400 md:text-blue-600">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-xl font-bold text-white md:text-gray-900">{displayName}</h1>
                    {displayTitle && (
                      <p className="text-sm text-slate-400 md:text-gray-500 mt-0.5">{displayTitle}</p>
                    )}
                  </div>
                  <Badge className={`${STATUS_COLORS[application.status] ?? "bg-gray-100 text-gray-800"} shrink-0`}>
                    {application.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 md:text-gray-500">
                  {displayLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {displayLocation}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {application.jobs.title}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                </div>

                {isProfessionalApplicant && application.professional_profiles?.experience_level && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-slate-600 md:border-gray-300 text-slate-400 md:text-gray-600">
                      {experienceLevelLabel[application.professional_profiles.experience_level] ?? application.professional_profiles.experience_level}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-700 md:border-gray-200">
              <Button variant="outline" size="sm" asChild className="border-slate-600 md:border-gray-300">
                <Link href={messageUrl}>
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Message
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-slate-600 md:border-gray-300">
                <Link href={profileUrl} target="_blank">
                  <User className="h-4 w-4 mr-1.5" />
                  View Profile
                </Link>
              </Button>
              {isProfessionalApplicant && (
                <Button variant="outline" size="sm" onClick={loadCV} className="border-slate-600 md:border-gray-300">
                  <Eye className="h-4 w-4 mr-1.5" />
                  View CV
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Select value={application.status} onValueChange={updateStatus} disabled={loading}>
                  <SelectTrigger className="w-[140px] bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deleteApplication}
                  disabled={loading}
                  className="text-red-500 border-red-800 md:border-red-200 hover:bg-red-900/20 md:hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Letter */}
        {application.cover_letter && (
          <Card className="mb-4 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2 text-white md:text-gray-900">
                <FileText className="h-4 w-4" />
                Cover Letter
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-sm whitespace-pre-wrap text-slate-300 md:text-gray-700 leading-relaxed">
                {application.cover_letter}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Professional details */}
        {isProfessionalApplicant && application.professional_profiles && (
          <Card className="mb-4 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2 text-white md:text-gray-900">
                <User className="h-4 w-4" />
                Applicant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {application.professional_profiles.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <span className="text-slate-300 md:text-gray-700">{application.professional_profiles.phone}</span>
                  </div>
                )}
                {application.professional_profiles.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <span className="text-slate-300 md:text-gray-700">{application.professional_profiles.location}</span>
                  </div>
                )}
                {application.professional_profiles.portfolio_url && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Globe className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <a
                      href={application.professional_profiles.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 md:text-blue-600 hover:underline truncate"
                    >
                      {application.professional_profiles.portfolio_url}
                    </a>
                    <ExternalLink className="h-3 w-3 text-slate-500 shrink-0" />
                  </div>
                )}
                {application.professional_profiles.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Linkedin className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <a
                      href={application.professional_profiles.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 md:text-blue-600 hover:underline truncate"
                    >
                      {application.professional_profiles.linkedin_url}
                    </a>
                  </div>
                )}
                {application.professional_profiles.github_url && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Github className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <a
                      href={application.professional_profiles.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 md:text-blue-600 hover:underline truncate"
                    >
                      {application.professional_profiles.github_url}
                    </a>
                  </div>
                )}
              </div>

              {application.professional_profiles.skills && application.professional_profiles.skills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 md:text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {application.professional_profiles.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Company applicant details */}
        {isCompanyApplicant && application.company_profiles && (
          <Card className="mb-4 bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2 text-white md:text-gray-900">
                <Building2 className="h-4 w-4" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                  <span className="text-slate-300 md:text-gray-700">{application.company_profiles.industry}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                  <span className="text-slate-300 md:text-gray-700">{application.company_profiles.location}</span>
                </div>
                {application.company_profiles.company_size && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <span className="text-slate-300 md:text-gray-700">{application.company_profiles.company_size} employees</span>
                  </div>
                )}
                {application.company_profiles.website && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Globe className="h-4 w-4 text-slate-500 md:text-gray-400 shrink-0" />
                    <a
                      href={application.company_profiles.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 md:text-blue-600 hover:underline truncate"
                    >
                      {application.company_profiles.website}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CV Dialog */}
      {cvData && selectedProfessionalData && !loadingCV && (
        <CVDialog
          cvData={cvData as any}
          displayName={displayName}
          displayEmail={selectedProfessionalData.displayEmail}
          displayPhone={selectedProfessionalData.displayPhone}
          displayAddress={selectedProfessionalData.displayAddress}
          professionalTitle={selectedProfessionalData.professionalTitle}
          profilePhotoUrl={selectedProfessionalData.profilePhotoUrl}
          canSeeEmail={selectedProfessionalData.canSeeEmail}
          hasPrivacyPermission={selectedProfessionalData.hasPrivacyPermission}
          open={showCVDialog}
          onOpenChange={setShowCVDialog}
          showTrigger={false}
        />
      )}

      {showCVDialog && (loadingCV || (!cvData && !selectedProfessionalData)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-80 bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              {loadingCV ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-300">Loading CV...</p>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 mx-auto mb-3 text-slate-500 opacity-50" />
                  <p className="font-medium text-white mb-1">No CV found</p>
                  <p className="text-sm text-slate-400">This candidate hasn't built a structured CV yet.</p>
                  <Button className="mt-4" size="sm" variant="outline" onClick={() => setShowCVDialog(false)}>
                    Close
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}