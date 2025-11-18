// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Briefcase,
  MapPin,
  Calendar,
  ExternalLink,
  ArrowLeft,
  User,
  Mail,
  MessageSquare,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { CVDialog } from "@/components/cv-dialog"

interface ApplicationPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ApplicationPage({ params }: ApplicationPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: application, error } = await supabase
    .from("job_applications")
    .select(`
      *,
      jobs!inner (
        id,
        title,
        company_id,
        homeowner_id,
        location,
        job_type,
        salary_min,
        salary_max,
        company_profiles (
          company_name,
          user_id
        ),
        homeowner_profiles (
          first_name,
          last_name,
          user_id
        )
      ),
      professional_profiles (
        id,
        first_name,
        last_name,
        nickname,
        title,
        location,
        phone,
        hide_email,
        skills,
        experience_level,
        portfolio_url,
        linkedin_url,
        github_url,
        user_id,
        profile_photo_url,
        users (
          email
        )
      ),
      company_profiles!job_applications_company_id_fkey (
        id,
        company_name,
        industry,
        company_size,
        location,
        website_url,
        logo_url,
        user_id
      )
    `)
    .eq("id", id)
    .single()

  if (error || !application) {
    console.error("Application not found:", error)
    notFound()
  }

  const { data: companyProfile } = await supabase.from("company_profiles").select("id").eq("user_id", user.id).single()

  const { data: professionalProfile} = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single()

  // Determine applicant type
  const isCompanyApplicant = !!application.company_id
  const isProfessionalApplicant = !!application.professional_id

  // Determine if current user is the job poster (company or homeowner)
  const isJobPosterCompany = application.jobs.company_profiles && application.jobs.company_profiles.user_id === user.id
  const isJobPosterHomeowner = application.jobs.homeowner_profiles && application.jobs.homeowner_profiles.user_id === user.id
  const isJobPoster = isJobPosterCompany || isJobPosterHomeowner

  // Determine if current user is the applicant
  const isApplicantOwner =
    (isProfessionalApplicant && professionalProfile && application.professional_profiles?.id === professionalProfile.id) ||
    (isCompanyApplicant && companyProfile && application.company_profiles?.id === companyProfile.id)

  if (!isJobPoster && !isApplicantOwner) {
    redirect("/dashboard")
  }

  // Check if employer has permission to see personal info (only for professional applicants)
  let hasPrivacyPermission = false
  if (isJobPoster && isProfessionalApplicant && application.professional_profiles) {
    console.log("[APPLICATION] ========== PRIVACY PERMISSION CHECK ==========")
    console.log("[APPLICATION] Checking privacy permission for:")
    console.log("[APPLICATION] - Professional ID (from application.professional_id):", application.professional_id)
    console.log("[APPLICATION] - Professional Profile ID (from application.professional_profiles.id):", application.professional_profiles.id)
    console.log("[APPLICATION] - Employer User ID (logged in user.id):", user.id)

    const { data: privacyPermission, error: privacyError } = await supabase
      .from("employer_privacy_permissions")
      .select("*")
      .eq("professional_id", application.professional_profiles.user_id)
      .eq("employer_id", user.id)
      .maybeSingle()

    console.log("[APPLICATION] Privacy permission query result:", JSON.stringify(privacyPermission, null, 2))
    console.log("[APPLICATION] Privacy permission error:", privacyError)

    hasPrivacyPermission = privacyPermission?.can_see_personal_info || false
    console.log("[APPLICATION] Has privacy permission:", hasPrivacyPermission)
    console.log("[APPLICATION] ========================================")
  }

  // Fetch company applicant's email separately (since we can't join through users table)
  let companyApplicantEmail: string | null = null
  if (isCompanyApplicant && application.company_profiles?.user_id) {
    const { data: userData } = await supabase
      .from("users")
      .select("email")
      .eq("id", application.company_profiles.user_id)
      .single()

    companyApplicantEmail = userData?.email || null
  }

  const loadCandidateCV = async () => {
    // Only load CV for professional applicants
    if (!isProfessionalApplicant || !application.professional_profiles) {
      console.log("[CV-LOAD] Skipping CV load - not a professional applicant")
      return null
    }

    try {
      console.log("[CV-LOAD] Loading CV for professional_id:", application.professional_profiles.id)

      const { data: cvRecord, error: cvError } = await supabase
        .from("professional_cvs")
        .select("*")
        .eq("professional_id", application.professional_profiles.id)
        .single()

      console.log("[CV-LOAD] CV Record:", cvRecord)
      console.log("[CV-LOAD] CV Error:", cvError)

      if (cvRecord) {
        console.log("[CV-LOAD] CV found, loading sections...")
        const [workExp, education, skills, languages, certifications, projects] = await Promise.all([
          supabase.from("cv_work_experience").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_education").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_skills").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_languages").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_certifications").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_projects").select("*").eq("cv_id", cvRecord.id).order("display_order"),
        ])

        return {
          id: cvRecord.id,
          summary: cvRecord.summary || "",
          citizenship: cvRecord.citizenship || "",
          workPermitStatus: cvRecord.work_permit_status || "",
          hasDrivingLicense: cvRecord.has_driving_license || false,
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
        }
      }
      console.log("[CV-LOAD] No CV record found")
      return null
    } catch (error) {
      console.error("[CV-LOAD] Error loading CV data:", error)
      return null
    }
  }

  const cvData = await loadCandidateCV()
  console.log("[CV-LOAD] Final cvData:", cvData ? "CV exists" : "No CV")

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified"
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `From £${min.toLocaleString()}`
    if (max) return `Up to £${max.toLocaleString()}`
  }

  const formatDateShort = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  // Determine applicant info based on type (professional or company)
  const displayName = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.company_name
    : isProfessionalApplicant && application.professional_profiles
    ? hasPrivacyPermission
      ? `${application.professional_profiles.first_name} ${application.professional_profiles.last_name}`
      : application.professional_profiles.nickname ||
        `${application.professional_profiles.first_name} ${application.professional_profiles.last_name[0]}.`
    : "Unknown Applicant"

  const displayInitials = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.company_name.substring(0, 2).toUpperCase()
    : isProfessionalApplicant && application.professional_profiles
    ? hasPrivacyPermission
      ? `${application.professional_profiles.first_name[0]}${application.professional_profiles.last_name[0]}`
      : application.professional_profiles.nickname?.[0] || application.professional_profiles.first_name[0]
    : "?"

  const displayTitle = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.industry || "Company"
    : isProfessionalApplicant && application.professional_profiles
    ? application.professional_profiles.title
    : ""

  // Get email - for companies always show, for professionals respect privacy
  const canSeeEmail = isCompanyApplicant
    ? true
    : isProfessionalApplicant && hasPrivacyPermission && !application.professional_profiles?.hide_email

  const displayEmail = isCompanyApplicant && application.company_profiles
    ? companyApplicantEmail || "No email available"
    : isProfessionalApplicant && application.professional_profiles
    ? canSeeEmail
      ? (application.professional_profiles.users?.email || "No email available")
      : "Hidden (privacy settings)"
    : "No email available"

  // Get phone - for companies not available, for professionals respect privacy
  const displayPhone = isCompanyApplicant && application.company_profiles
    ? "Not available"
    : isProfessionalApplicant && application.professional_profiles
    ? hasPrivacyPermission
      ? (application.professional_profiles.phone || "No phone available")
      : "Hidden (privacy settings)"
    : "No phone available"

  // Get address/location
  const displayAddress = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.location
    : isProfessionalApplicant && application.professional_profiles
    ? application.professional_profiles.location
    : "Location not specified"

  // Get photo URL
  const displayPhotoUrl = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.logo_url
    : isProfessionalApplicant && application.professional_profiles
    ? application.professional_profiles.profile_photo_url
    : null

  // Get applicant user ID for messaging
  const applicantUserId = isCompanyApplicant && application.company_profiles
    ? application.company_profiles.user_id
    : isProfessionalApplicant && application.professional_profiles
    ? application.professional_profiles.user_id
    : null

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={isJobPoster ? (isJobPosterCompany ? "/dashboard/company" : "/dashboard") : (isCompanyApplicant ? "/dashboard/company" : "/dashboard/professional")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={displayPhotoUrl || "/placeholder.svg"}
                        alt={displayName}
                      />
                      <AvatarFallback className="text-lg">{displayInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{displayName}</CardTitle>
                      <p className="text-lg text-muted-foreground mb-2">{displayTitle}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {displayAddress}
                        </span>
                        {isProfessionalApplicant && application.professional_profiles?.experience_level && (
                          <Badge variant="outline" className="capitalize">
                            {application.professional_profiles.experience_level.replace("_", " ")}
                          </Badge>
                        )}
                        {isCompanyApplicant && (
                          <Badge variant="outline">
                            {isCompanyApplicant ? "Professional" : "Company"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(application.status)} variant="secondary">
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applied Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{application.jobs.title}</h3>
                    <p className="text-muted-foreground">{application.jobs.company_profiles.company_name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{application.jobs.location}</span>
                    </div>
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="capitalize">{application.jobs.job_type.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Applied {formatDate(application.applied_at)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Salary: </span>
                      {formatSalary(application.jobs.salary_min, application.jobs.salary_max)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {application.cover_letter && (
              <Card>
                <CardHeader>
                  <CardTitle>Cover Letter</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={application.cover_letter}
                    readOnly
                    className="min-h-[200px] resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>
            )}

            {cvData && isProfessionalApplicant && application.professional_profiles ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Candidate CV
                    </span>
                    <CVDialog
                      cvData={cvData}
                      displayName={displayName}
                      displayEmail={displayEmail}
                      displayPhone={displayPhone}
                      displayAddress={displayAddress || ""}
                      professionalTitle={application.professional_profiles.title}
                      profilePhotoUrl={application.professional_profiles.profile_photo_url}
                      canSeeEmail={canSeeEmail}
                      hasPrivacyPermission={hasPrivacyPermission}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cvData.summary && (
                      <div>
                        <h4 className="font-medium mb-2">Professional Summary</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">{cvData.summary}</p>
                      </div>
                    )}
                    {cvData.workExperience.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recent Experience</h4>
                        <div className="space-y-2">
                          {cvData.workExperience.slice(0, 2).map((exp, index) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">
                                {exp.jobTitle} at {exp.companyName}
                              </p>
                              <p className="text-muted-foreground">
                                {formatDateShort(exp.startDate)} -{" "}
                                {exp.isCurrent ? "Present" : formatDateShort(exp.endDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : isProfessionalApplicant ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Candidate CV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">This candidate has not created a CV yet.</p>
                </CardContent>
              </Card>
            ) : null}

            {isProfessionalApplicant && application.professional_profiles?.skills && application.professional_profiles.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {application.professional_profiles.skills.map((skill: string) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isCompanyApplicant && application.company_profiles && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.company_profiles.company_size && (
                    <div>
                      <span className="font-medium">Company Size: </span>
                      <span className="text-muted-foreground">{application.company_profiles.company_size}</span>
                    </div>
                  )}
                  {application.company_profiles.website_url && (
                    <div>
                      <span className="font-medium">Website: </span>
                      <a href={application.company_profiles.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {application.company_profiles.website_url}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {isJobPoster && applicantUserId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href={`/messages/${applicantUserId}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Applicant
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Start a conversation with this applicant about their application.
                  </p>
                </CardContent>
              </Card>
            )}

            {isJobPoster && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Contact Information
                  </CardTitle>
                  {isProfessionalApplicant && !hasPrivacyPermission && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Applicant has not shared personal contact information
                    </p>
                  )}
                  {isCompanyApplicant && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Company contact information
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    {canSeeEmail ? (
                      <a href={`mailto:${displayEmail}`} className="text-blue-600 hover:underline break-all">
                        {displayEmail}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{displayEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span className={hasPrivacyPermission ? "" : "text-muted-foreground"}>{displayPhone}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {isProfessionalApplicant && application.professional_profiles && (
              application.professional_profiles.portfolio_url ||
              application.professional_profiles.linkedin_url ||
              application.professional_profiles.github_url
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.professional_profiles.portfolio_url && (
                    <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                      <a href={application.professional_profiles.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Portfolio
                      </a>
                    </Button>
                  )}
                  {application.professional_profiles.linkedin_url && (
                    <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                      <a href={application.professional_profiles.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {application.professional_profiles.github_url && (
                    <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                      <a href={application.professional_profiles.github_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Application Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Application Submitted</p>
                      <p className="text-sm text-muted-foreground">{formatDate(application.applied_at)}</p>
                    </div>
                  </div>
                  {application.status !== "pending" && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium capitalize">Status: {application.status}</p>
                        <p className="text-sm text-muted-foreground">Updated recently</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
