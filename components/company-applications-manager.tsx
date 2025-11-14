"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Briefcase,
  MapPin,
  Search,
  ExternalLink,
  Calendar,
  FileText,
  Eye,
  Download,
  User,
  GraduationCap,
  Award,
  Code,
  Languages,
  FolderOpen,
  Trash2,
  Star,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Building2,
  Globe,
  Users,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { CVDialog } from "@/components/cv-dialog"

interface CompanyProfile {
  id: string
  company_name: string
}

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

interface CompanyApplicationsManagerProps {
  profile: CompanyProfile
  applications: Application[]
}

// CV Data interfaces
interface CVData {
  id?: string
  summary: string
  citizenship?: string
  workPermitStatus?: string
  hasDrivingLicense?: boolean
  workExperience: WorkExperience[]
  education: Education[]
  skills: Skill[]
  languages: Language[]
  certifications: Certification[]
  projects: Project[]
}

interface WorkExperience {
  id?: string
  jobTitle: string
  companyName: string
  location: string
  startDate: string
  endDate: string
  isCurrent: boolean
  responsibilities: string[]
  achievements: string[]
}

interface Education {
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
}

interface Skill {
  id?: string
  skillName: string
  category: string
  proficiencyLevel: string
  yearsExperience?: number
}

interface Language {
  id?: string
  languageName: string
  proficiencyLevel: string
  certification: string
}

interface Certification {
  id?: string
  certificationName: string
  issuingOrganization: string
  issueDate: string
  expiryDate: string
  credentialId: string
  credentialUrl: string
  description: string
}

interface Project {
  id?: string
  projectName: string
  description: string
  technologiesUsed: string[]
  projectUrl: string
  startDate: string
  endDate: string
  isOngoing: boolean
  role: string
}

export default function CompanyApplicationsManager({ profile, applications: initialApplications }: CompanyApplicationsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [applications, setApplications] = useState(initialApplications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [loading, setLoading] = useState<string | null>(null)
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loadingCV, setLoadingCV] = useState(false)
  const [showCVDialog, setShowCVDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<string>("")
  const [expandedApplications, setExpandedApplications] = useState<Set<string>>(new Set())
  const [selectedProfessionalData, setSelectedProfessionalData] = useState<{
    displayEmail: string
    displayPhone: string
    displayAddress: string
    professionalTitle: string
    profilePhotoUrl: string | null
    canSeeEmail: boolean
    hasPrivacyPermission: boolean
  } | null>(null)

  // Sync local state with props when they change
  useEffect(() => {
    setApplications(initialApplications)
  }, [initialApplications])

  const loadCandidateCV = async (professionalId: string, candidateName: string) => {
    setLoadingCV(true)
    setSelectedCandidate(candidateName)
    setShowCVDialog(true)

    try {
      // Get professional profile data
      const { data: professionalProfile } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          users!inner (
            email
          )
        `)
        .eq("id", professionalId)
        .single()

      if (professionalProfile) {
        setSelectedProfessionalData({
          displayEmail: professionalProfile.hide_email ? "" : professionalProfile.users.email,
          displayPhone: professionalProfile.phone || "",
          displayAddress: professionalProfile.location || "",
          professionalTitle: professionalProfile.title || "",
          profilePhotoUrl: professionalProfile.profile_photo_url || null,
          canSeeEmail: !professionalProfile.hide_email,
          hasPrivacyPermission: true, // Company always has permission to view applicant CVs
        })
      }

      // Get CV main record
      const { data: cvRecord } = await supabase
        .from("professional_cvs")
        .select("*")
        .eq("professional_id", professionalId)
        .single()

      if (cvRecord) {
        // Load all sections
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
          workExperience:
            workExp.data?.map((exp) => ({
              id: exp.id,
              jobTitle: exp.job_title,
              companyName: exp.company_name,
              location: exp.location || "",
              startDate: exp.start_date,
              endDate: exp.end_date || "",
              isCurrent: exp.is_current,
              responsibilities: exp.responsibilities || [],
              achievements: exp.achievements || [],
            })) || [],
          education:
            education.data?.map((edu) => ({
              id: edu.id,
              institutionName: edu.institution_name,
              degreeTitle: edu.degree_title,
              fieldOfStudy: edu.field_of_study || "",
              location: edu.location || "",
              startDate: edu.start_date || "",
              endDate: edu.end_date || "",
              isOngoing: edu.is_ongoing,
              gradeGpa: edu.grade_gpa || "",
              description: edu.description || "",
            })) || [],
          skills:
            skills.data?.map((skill) => ({
              id: skill.id,
              skillName: skill.skill_name,
              category: skill.category || "",
              proficiencyLevel: skill.proficiency_level || "",
              yearsExperience: skill.years_experience,
            })) || [],
          languages:
            languages.data?.map((lang) => ({
              id: lang.id,
              languageName: lang.language_name,
              proficiencyLevel: lang.proficiency_level,
              certification: lang.certification || "",
            })) || [],
          certifications:
            certifications.data?.map((cert) => ({
              id: cert.id,
              certificationName: cert.certification_name,
              issuingOrganization: cert.issuing_organization,
              issueDate: cert.issue_date || "",
              expiryDate: cert.expiry_date || "",
              credentialId: cert.credential_id || "",
              credentialUrl: cert.credential_url || "",
              description: cert.description || "",
            })) || [],
          projects:
            projects.data?.map((proj) => ({
              id: proj.id,
              projectName: proj.project_name,
              description: proj.description,
              technologiesUsed: proj.technologies_used || [],
              projectUrl: proj.project_url || "",
              startDate: proj.start_date || "",
              endDate: proj.end_date || "",
              isOngoing: proj.is_ongoing,
              role: proj.role || "",
            })) || [],
        })
      } else {
        setCvData(null)
      }
    } catch (error) {
      console.error("Error loading CV data:", error)
      setCvData(null)
    } finally {
      setLoadingCV(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  const handleDownloadCV = async () => {
    if (!cvData || !selectedCandidate) return

    try {
      const response = await fetch("/api/cv/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvData,
          candidateName: selectedCandidate,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${selectedCandidate.replace(" ", "_")}_CV.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Error generating PDF. Please try again.")
      }
    } catch (error) {
      console.error("Error downloading CV:", error)
      alert("Error downloading CV. Please try again.")
    }
  }

  // Get unique jobs for filter
  const uniqueJobs = Array.from(new Set(applications.map((app) => app.jobs.id))).map((jobId) => {
    const app = applications.find((a) => a.jobs.id === jobId)
    return { id: jobId, title: app?.jobs.title || "" }
  })

  const filteredApplications = applications.filter((application) => {
    // Build search string based on applicant type
    let searchString = application.jobs.title.toLowerCase()

    if (application.professional_profiles) {
      searchString += ` ${application.professional_profiles.first_name} ${application.professional_profiles.last_name} ${application.professional_profiles.title}`
    } else if (application.company_profiles) {
      searchString += ` ${application.company_profiles.company_name} ${application.company_profiles.industry}`
    }

    const matchesSearch = searchString.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || application.status === statusFilter
    const matchesJob = jobFilter === "all" || application.jobs.id === jobFilter

    return matchesSearch && matchesStatus && matchesJob
  })

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    setLoading(applicationId)
    try {
      const { error } = await supabase.from("job_applications").update({ status: newStatus }).eq("id", applicationId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error updating application status:", error)
      alert("Failed to update application status")
    } finally {
      setLoading(null)
    }
  }

  const deleteApplication = async (applicationId: string, applicantName: string) => {
    if (!confirm(`Are you sure you want to delete the application from ${applicantName}? This action cannot be undone.`)) {
      console.log("[DELETE-APP] User cancelled deletion")
      return
    }

    console.log("[DELETE-APP] Starting deletion for application:", applicationId)
    setLoading(applicationId)

    // Store original applications for rollback if needed
    const originalApplications = [...applications]

    // Optimistic update - remove from UI immediately
    setApplications(prev => prev.filter(app => app.id !== applicationId))
    console.log("[DELETE-APP] Removed application from UI (optimistic update)")

    try {
      const { data, error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", applicationId)
        .select()

      console.log("[DELETE-APP] Delete result:", { data, error })

      if (error) {
        console.error("[DELETE-APP] Delete error:", error)
        // Rollback optimistic update
        setApplications(originalApplications)
        console.log("[DELETE-APP] Rolled back UI changes due to error")
        throw error
      }

      console.log("[DELETE-APP] Application deleted successfully from database")
      // Also refresh from server to ensure consistency
      router.refresh()
    } catch (error) {
      console.error("[DELETE-APP] Error deleting application:", error)
      alert(`Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  const toggleExpanded = (applicationId: string) => {
    setExpandedApplications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId)
      } else {
        newSet.add(applicationId)
      }
      return newSet
    })
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const getProfileUrl = (application: Application) => {
    if (application.professional_profiles?.user_id) {
      return `/professional/${application.professional_profiles.user_id}`
    } else if (application.company_profiles?.user_id) {
      return `/company/${application.company_profiles.user_id}`
    }
    console.warn("[PROFILE-URL] Missing user_id for application:", application.id)
    return "#"
  }

  const getMessageUrl = (application: Application) => {
    const userId = application.professional_profiles?.user_id || application.company_profiles?.user_id
    return `/messages?user=${userId}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Applications</h1>
          <p className="text-muted-foreground">
            Review and manage applications for {profile.company_name} job postings
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by candidate name, title, or job..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {uniqueJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {applications.length === 0 ? "No applications yet" : "No applications match your filters"}
              </h3>
              <p className="text-muted-foreground">
                {applications.length === 0
                  ? "Applications will appear here when candidates apply to your jobs."
                  : "Try adjusting your search terms or filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              // Determine applicant type and create display variables
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

              const isExpanded = expandedApplications.has(application.id)

              return (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    {/* Main Card Header - Always Visible */}
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpanded(application.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {displayInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-base font-semibold truncate">
                                {displayName}
                              </h3>
                              {isCompanyApplicant && (
                                <Badge variant="secondary" className="text-xs shrink-0">Company</Badge>
                              )}
                              <Badge className={`${getStatusColor(application.status)} text-xs shrink-0`}>{application.status}</Badge>
                            </div>

                            {/* Stars Rating - More Compact */}
                            <div className="flex items-center gap-1 mb-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              ))}
                              <span className="text-xs text-muted-foreground ml-0.5">(5.0)</span>
                              <span className="text-xs text-muted-foreground mx-1">•</span>
                              <span className="text-xs text-muted-foreground">{displayTitle}</span>
                            </div>

                            {/* Cover Letter Preview - More Compact */}
                            {application.cover_letter && (
                              <div className="bg-muted/30 p-2 rounded mb-1.5">
                                <p className="text-xs text-muted-foreground italic line-clamp-2">
                                  "{truncateText(application.cover_letter, 100)}"
                                </p>
                              </div>
                            )}

                            {/* Metadata - More Compact */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {application.jobs.title}
                              </span>
                              <span>•</span>
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {displayLocation}
                              </span>
                              <span>•</span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDateShort(application.applied_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Expand Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1 shrink-0 h-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(application.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        <div className="p-6 space-y-6">
                          {/* Full Cover Letter */}
                          {application.cover_letter && (
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Cover Letter
                              </h4>
                              <div className="bg-white p-4 rounded-md border">
                                <p className="text-sm whitespace-pre-wrap">{application.cover_letter}</p>
                              </div>
                            </div>
                          )}

                          {/* Professional/Company Details */}
                          {isProfessionalApplicant && application.professional_profiles && (
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Professional Details
                              </h4>
                              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-md border">
                                {application.professional_profiles.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{application.professional_profiles.phone}</span>
                                  </div>
                                )}
                                {application.professional_profiles.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{application.professional_profiles.location}</span>
                                  </div>
                                )}
                                {application.professional_profiles.portfolio_url && (
                                  <div className="flex items-center gap-2 col-span-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a href={application.professional_profiles.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                      {application.professional_profiles.portfolio_url}
                                    </a>
                                  </div>
                                )}
                              </div>
                              {/* Skills */}
                              {application.professional_profiles.skills && application.professional_profiles.skills.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="text-sm font-medium mb-2">Skills</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {application.professional_profiles.skills.map((skill) => (
                                      <Badge key={skill} variant="outline">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isCompanyApplicant && application.company_profiles && (
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center">
                                <Building2 className="h-4 w-4 mr-2" />
                                Company Details
                              </h4>
                              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-md border">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{application.company_profiles.industry}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{application.company_profiles.location}</span>
                                </div>
                                {application.company_profiles.company_size && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{application.company_profiles.company_size} employees</span>
                                  </div>
                                )}
                                {application.company_profiles.website && (
                                  <div className="flex items-center gap-2 col-span-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a href={application.company_profiles.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                      {application.company_profiles.website}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                              {/* Message Button */}
                              <Button variant="outline" size="sm" asChild>
                                <Link href={getMessageUrl(application)}>
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Message
                                </Link>
                              </Button>

                              {/* View Profile Button */}
                              <Button variant="outline" size="sm" asChild>
                                <Link href={getProfileUrl(application)}>
                                  <User className="h-4 w-4 mr-2" />
                                  View Profile
                                </Link>
                              </Button>

                              {/* View CV Button (Professional Only) */}
                              {isProfessionalApplicant && application.professional_profiles && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    loadCandidateCV(application.professional_profiles!.id, displayName)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View CV
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Status Selector */}
                              <Select
                                value={application.status}
                                onValueChange={(value) => updateApplicationStatus(application.id, value)}
                                disabled={loading === application.id}
                              >
                                <SelectTrigger className="w-[140px]" onClick={(e) => e.stopPropagation()}>
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

                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteApplication(application.id, displayName)
                                }}
                                disabled={loading === application.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {cvData && selectedProfessionalData && !loadingCV && (
        <CVDialog
          cvData={cvData as any}
          displayName={selectedCandidate}
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

      <Dialog open={showCVDialog && (loadingCV || (!cvData && !selectedProfessionalData))} onOpenChange={setShowCVDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading CV...</DialogTitle>
            <DialogDescription>
              Please wait while we retrieve the candidate's CV information
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            {loadingCV ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">No CV data found</p>
                <p className="text-sm text-muted-foreground">This candidate hasn't built a structured CV yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
