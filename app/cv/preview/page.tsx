"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Briefcase,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Calendar,
  GraduationCap,
  Languages,
  Award,
  Code,
  User,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

export default function CVPreviewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [cvData, setCvData] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      // Add timeout protection
      const timeoutId = setTimeout(() => {
        console.error("[CV-PREVIEW] ❌ Timeout after 10 seconds - redirecting to builder")
        setLoading(false)
        router.push("/cv/builder")
      }, 10000)

      try {
        console.log("[CV-PREVIEW] Starting to load CV data...")

        console.log("[CV-PREVIEW] Step 1: Getting user...")
        const {
          data: { user },
        } = await supabase.auth.getUser()
        console.log("[CV-PREVIEW] Step 1 complete - User:", user?.id)

        if (!user) {
          console.log("[CV-PREVIEW] No user, redirecting to login")
          clearTimeout(timeoutId)
          router.push("/auth/login")
          return
        }

        // Get professional profile
        console.log("[CV-PREVIEW] Step 2: Fetching professional profile...")
        const { data: profileData, error: profileError } = await supabase
          .from("professional_profiles")
          .select(`
            *,
            users!inner(email)
          `)
          .eq("user_id", user.id)
          .single()
        console.log("[CV-PREVIEW] Step 2 complete - Profile:", profileData?.id, "Error:", profileError)

        if (profileError) {
          console.error("[CV-PREVIEW] Error fetching profile:", profileError)
        }

        if (!profileData) {
          console.log("[CV-PREVIEW] No profile found, redirecting to onboarding")
          clearTimeout(timeoutId)
          router.push("/onboarding")
          return
        }

        setProfile(profileData)

        // Get CV data
        console.log("[CV-PREVIEW] Step 3: Fetching CV record...")
        const { data: cvRecord, error: cvError } = await supabase
          .from("professional_cvs")
          .select("*")
          .eq("professional_id", profileData.id)
          .single()
        console.log("[CV-PREVIEW] Step 3 complete - CV:", cvRecord?.id, "Error:", cvError)

        if (cvError) {
          console.error("[CV-PREVIEW] Error fetching CV:", cvError)
        }

        if (!cvRecord) {
          console.log("[CV-PREVIEW] No CV found, redirecting to builder")
          clearTimeout(timeoutId)
          router.push("/cv/builder")
          return
        }

        // Load all CV sections
        console.log("[CV-PREVIEW] Step 4: Loading CV sections...")
        const [workExp, education, skills, languages, certifications, projects] = await Promise.all([
          supabase.from("cv_work_experience").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_education").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_skills").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_languages").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_certifications").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_projects").select("*").eq("cv_id", cvRecord.id).order("display_order"),
        ])
        console.log("[CV-PREVIEW] Step 4 complete - All sections loaded")

        setCvData({
          summary: cvRecord.summary || "",
          workExperience: workExp.data?.map((exp: any) => ({
          jobTitle: exp.job_title,
          companyName: exp.company_name,
          location: exp.location || "",
          startDate: exp.start_date,
          endDate: exp.end_date || "",
          isCurrent: exp.is_current,
          responsibilities: exp.responsibilities || [],
          achievements: exp.achievements || [],
        })) || [],
        education: education.data?.map((edu: any) => ({
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
        skills: skills.data?.map((skill: any) => ({
          skillName: skill.skill_name,
          category: skill.category || "",
          proficiencyLevel: skill.proficiency_level || "",
          yearsExperience: skill.years_experience,
        })) || [],
        languages: languages.data?.map((lang: any) => ({
          languageName: lang.language_name,
          proficiencyLevel: lang.proficiency_level,
          certification: lang.certification || "",
        })) || [],
        certifications: certifications.data?.map((cert: any) => ({
          certificationName: cert.certification_name,
          issuingOrganization: cert.issuing_organization,
          issueDate: cert.issue_date || "",
          expiryDate: cert.expiry_date || "",
          credentialId: cert.credential_id || "",
          credentialUrl: cert.credential_url || "",
          description: cert.description || "",
        })) || [],
        projects: projects.data?.map((proj: any) => ({
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

        console.log("[CV-PREVIEW] ✅ All data loaded successfully, setting loading to false")
        clearTimeout(timeoutId)
        setLoading(false)
      } catch (error) {
        console.error("[CV-PREVIEW] ❌ Error loading CV data:", error)
        console.error("[CV-PREVIEW] Error details:", error instanceof Error ? error.message : String(error))
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading CV...</p>
      </div>
    )
  }

  if (!profile || !cvData) {
    return null
  }

  const formatDateShort = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  const displayName = `${profile.first_name} ${profile.last_name}`

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Open Job Market</span>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/professional">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 print:hidden">
          <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8 space-y-8">
            {/* Header with Contact Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200 print:border print:border-gray-300">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{displayName}</h1>
              {profile.title && (
                <h2 className="text-xl text-gray-700 mb-4">{profile.title}</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-gray-700">Email:</span>
                  <a href={`mailto:${profile.users.email}`} className="text-blue-600 hover:underline break-all">
                    {profile.users.email}
                  </a>
                </div>
                {profile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-900">{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="text-gray-900">{profile.location}</span>
                  </div>
                )}
                {profile.portfolio_url && (
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">Portfolio:</span>
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {profile.portfolio_url}
                    </a>
                  </div>
                )}
                {profile.linkedin_url && (
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">LinkedIn:</span>
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {profile.linkedin_url}
                    </a>
                  </div>
                )}
                {profile.github_url && (
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">GitHub:</span>
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {profile.github_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {cvData.summary && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
                  <User className="h-5 w-5 mr-2" />
                  Professional Summary
                </h3>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg print:bg-transparent">
                  {cvData.summary}
                </p>
              </div>
            )}

            {/* Work Experience */}
            {cvData.workExperience.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Work Experience
                </h3>
                <div className="space-y-4">
                  {cvData.workExperience.map((exp: any, index: number) => (
                    <div
                      key={index}
                      className="border-l-4 border-blue-200 pl-4 bg-blue-50/50 p-4 rounded-r-lg print:bg-transparent break-inside-avoid"
                    >
                      <div className="flex justify-between items-start mb-2 flex-wrap">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{exp.jobTitle}</h4>
                          <p className="text-gray-700">{exp.companyName}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDateShort(exp.startDate)} -{" "}
                            {exp.isCurrent ? "Present" : formatDateShort(exp.endDate)}
                          </div>
                          {exp.location && (
                            <div className="flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {exp.location}
                            </div>
                          )}
                        </div>
                      </div>
                      {exp.responsibilities.length > 0 && (
                        <div className="mb-2">
                          <p className="font-medium text-gray-800 mb-1">Key Responsibilities:</p>
                          <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {exp.responsibilities.map((resp: string, i: number) => (
                              <li key={i} className="text-sm">
                                {resp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {exp.achievements.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-800 mb-1">Key Achievements:</p>
                          <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {exp.achievements.map((achievement: string, i: number) => (
                              <li key={i} className="text-sm">
                                {achievement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {cvData.education.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Education
                </h3>
                <div className="space-y-4">
                  {cvData.education.map((edu: any, index: number) => (
                    <div key={index} className="border-l-4 border-green-200 pl-4 bg-green-50/50 p-4 rounded-r-lg print:bg-transparent break-inside-avoid">
                      <div className="flex justify-between items-start mb-2 flex-wrap">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{edu.degreeTitle}</h4>
                          <p className="text-gray-700">{edu.institutionName}</p>
                          {edu.fieldOfStudy && (
                            <p className="text-sm text-gray-600">{edu.fieldOfStudy}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDateShort(edu.startDate)} -{" "}
                            {edu.isOngoing ? "Present" : formatDateShort(edu.endDate)}
                          </div>
                          {edu.location && (
                            <div className="flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {edu.location}
                            </div>
                          )}
                        </div>
                      </div>
                      {edu.gradeGpa && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Grade/GPA:</span> {edu.gradeGpa}
                        </p>
                      )}
                      {edu.description && (
                        <p className="text-sm text-gray-700 mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {cvData.skills.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Skills</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(
                    cvData.skills.reduce(
                      (acc: any, skill: any) => {
                        const category = skill.category || "Other"
                        if (!acc[category]) acc[category] = []
                        acc[category].push(skill)
                        return acc
                      },
                      {} as Record<string, any[]>,
                    ),
                  ) as [string, any[]][]).map(([category, skills]) => (
                    <div key={category} className="bg-purple-50/50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300">
                      <h4 className="font-medium text-gray-800 mb-2">{category}</h4>
                      <div className="space-y-1">
                        {skills.map((skill: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{skill.skillName}</span>
                            <span className="text-gray-600">{skill.proficiencyLevel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {cvData.languages.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                  <Languages className="h-5 w-5 mr-2" />
                  Languages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cvData.languages.map((lang: any, index: number) => (
                    <div key={index} className="bg-orange-50/50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{lang.languageName}</span>
                        <Badge variant="outline" className="text-xs">
                          {lang.proficiencyLevel}
                        </Badge>
                      </div>
                      {lang.certification && (
                        <p className="text-xs text-gray-600 mt-1">{lang.certification}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {cvData.certifications.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                  <Award className="h-5 w-5 mr-2" />
                  Certifications
                </h3>
                <div className="space-y-3">
                  {cvData.certifications.map((cert: any, index: number) => (
                    <div key={index} className="border-l-4 border-yellow-200 pl-4 bg-yellow-50/50 p-4 rounded-r-lg print:bg-transparent break-inside-avoid">
                      <div className="flex justify-between items-start flex-wrap">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{cert.certificationName}</h4>
                          <p className="text-gray-700">{cert.issuingOrganization}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {cert.issueDate && (
                            <div>Issued: {formatDateShort(cert.issueDate)}</div>
                          )}
                          {cert.expiryDate && (
                            <div>Expires: {formatDateShort(cert.expiryDate)}</div>
                          )}
                        </div>
                      </div>
                      {cert.credentialId && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Credential ID:</span> {cert.credentialId}
                        </p>
                      )}
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center mt-1 print:text-gray-700"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Credential
                        </a>
                      )}
                      {cert.description && (
                        <p className="text-sm text-gray-700 mt-2">{cert.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {cvData.projects.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                  <Code className="h-5 w-5 mr-2" />
                  Projects
                </h3>
                <div className="space-y-4">
                  {cvData.projects.map((project: any, index: number) => (
                    <div key={index} className="border-l-4 border-indigo-200 pl-4 bg-indigo-50/50 p-4 rounded-r-lg print:bg-transparent break-inside-avoid">
                      <div className="flex justify-between items-start mb-2 flex-wrap">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{project.projectName}</h4>
                          {project.role && (
                            <p className="text-sm text-gray-600">{project.role}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {project.startDate && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDateShort(project.startDate)} -{" "}
                              {project.isOngoing ? "Present" : formatDateShort(project.endDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{project.description}</p>
                      {project.technologiesUsed && project.technologiesUsed.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.technologiesUsed.map((tech: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {project.projectUrl && (
                        <a
                          href={project.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center mt-2 print:text-gray-700"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Project
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
