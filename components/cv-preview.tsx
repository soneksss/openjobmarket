"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Printer, X, Calendar, MapPin, Mail, Phone, Globe, Linkedin, Github } from "lucide-react"
import { createClient } from "@/lib/client"

interface CVPreviewProps {
  professionalId: string
  isOpen: boolean
  onClose: () => void
}

interface CVData {
  id?: string
  summary: string
  workExperience: WorkExperience[]
  education: Education[]
  skills: Skill[]
  languages: Language[]
  certifications: Certification[]
  projects: Project[]
  personalInfo?: {
    firstName: string
    lastName: string
    title: string
    location: string
    email: string
    phone: string
    portfolioUrl: string
    linkedinUrl: string
    githubUrl: string
    profilePhotoUrl?: string
    citizenship?: string
    workPermitStatus?: string
    hasDrivingLicense?: boolean
  }
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

export default function CVPreview({ professionalId, isOpen, onClose }: CVPreviewProps) {
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen && professionalId) {
      loadCVData()
    }
  }, [isOpen, professionalId])

  const loadCVData = async () => {
    setLoading(true)
    try {
      // Get professional profile for personal info
      const { data: profile } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          users!inner(email, phone)
        `)
        .eq("id", professionalId)
        .single()

      // Get CV main record
      const { data: cvRecord } = await supabase
        .from("professional_cvs")
        .select("*")
        .eq("professional_id", professionalId)
        .single()

      if (cvRecord && profile) {
        // Extract user data from join
        const userEmail = profile.users?.email || ""
        const userPhone = profile.users?.phone || ""
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
          personalInfo: {
            firstName: profile.first_name,
            lastName: profile.last_name,
            title: profile.title || "",
            location: profile.location || "",
            email: userEmail,
            phone: userPhone,
            portfolioUrl: profile.portfolio_url || "",
            linkedinUrl: profile.linkedin_url || "",
            githubUrl: profile.github_url || "",
            profilePhotoUrl: profile.profile_photo_url || "",
            citizenship: cvRecord.citizenship || "",
            workPermitStatus: cvRecord.work_permit_status || "",
            hasDrivingLicense: cvRecord.has_driving_license || false,
          },
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
      }
    } catch (error) {
      console.error("Error loading CV data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      // Create a simple PDF generation request
      const response = await fetch("/api/cv/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          cvData,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${cvData?.personalInfo?.firstName}_${cvData?.personalInfo?.lastName}_CV.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Error generating PDF. Please try again.")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Error downloading PDF. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!cvData) return

    const printWindow = window.open("", "", "width=800,height=600")
    if (!printWindow) return

    const displayName = `${cvData.personalInfo?.firstName || ""} ${cvData.personalInfo?.lastName || ""}`.trim()

    const cvHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>CV - ${displayName}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }

            body {
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              background: #fff;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
            }

            * {
              box-sizing: border-box;
            }

            h1 {
              font-size: 24pt;
              font-weight: bold;
              margin: 0 0 4pt 0;
              color: #000;
            }

            h2 {
              font-size: 14pt;
              font-weight: normal;
              margin: 0 0 12pt 0;
              color: #333;
            }

            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 16pt 0 8pt 0;
              padding-bottom: 4pt;
              border-bottom: 1px solid #333;
              color: #000;
            }

            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 0 0 2pt 0;
              color: #000;
            }

            p {
              margin: 0 0 8pt 0;
            }

            .header-section {
              display: flex;
              gap: 20pt;
              margin-bottom: 20pt;
            }

            .profile-photo {
              flex-shrink: 0;
            }

            .profile-photo img {
              width: 100pt;
              height: 100pt;
              border-radius: 50%;
              object-fit: cover;
              border: 2pt solid #ddd;
            }

            .contact-info {
              flex: 1;
            }

            .contact-details {
              margin: 0 0 8pt 0;
            }

            .contact-item {
              display: flex;
              align-items: center;
              margin: 2pt 0;
              font-size: 10pt;
            }

            .additional-info {
              margin: 8pt 0;
              font-size: 10pt;
              color: #333;
            }

            .info-row {
              display: flex;
              margin: 2pt 0;
            }

            .info-label {
              font-weight: bold;
              min-width: 100pt;
            }

            .links {
              display: flex;
              flex-wrap: wrap;
              gap: 12pt;
              font-size: 10pt;
            }

            .link {
              color: #0066cc;
              text-decoration: none;
            }

            .link:hover {
              text-decoration: underline;
            }

            .section {
              margin-bottom: 16pt;
            }

            .summary-text {
              line-height: 1.5;
            }

            .experience-item,
            .education-item,
            .cert-item,
            .project-item {
              margin-bottom: 12pt;
            }

            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 4pt;
            }

            .item-title {
              flex: 1;
            }

            .item-dates {
              text-align: right;
              font-size: 10pt;
              color: #555;
            }

            .company-name,
            .institution-name,
            .org-name {
              color: #333;
              font-size: 10pt;
            }

            .field-study,
            .grade {
              color: #555;
              font-size: 10pt;
            }

            .responsibilities,
            .achievements {
              margin: 4pt 0;
            }

            .list-title {
              font-weight: bold;
              margin-bottom: 2pt;
            }

            ul {
              margin: 0;
              padding-left: 20pt;
              list-style-type: disc;
            }

            li {
              margin: 2pt 0;
              font-size: 10pt;
            }

            .skills-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12pt;
            }

            .skill-category {
              margin-bottom: 8pt;
            }

            .category-name {
              font-weight: bold;
              margin-bottom: 4pt;
            }

            .skill-item {
              display: flex;
              justify-content: space-between;
              font-size: 10pt;
              margin: 2pt 0;
            }

            .languages-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8pt;
            }

            .language-item {
              font-size: 10pt;
            }

            .lang-name {
              font-weight: bold;
            }

            .lang-level {
              color: #555;
            }

            .lang-cert {
              font-size: 9pt;
              color: #666;
            }

            .technologies {
              margin: 4pt 0;
              font-size: 10pt;
            }

            .tech-label {
              font-weight: bold;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header Section -->
          <div class="header-section">
            ${
              cvData.personalInfo?.profilePhotoUrl
                ? `
            <div class="profile-photo">
              <img src="${cvData.personalInfo.profilePhotoUrl}" alt="Profile Photo" />
            </div>
            `
                : ""
            }

            <div class="contact-info">
              <h1>${displayName}</h1>
              ${cvData.personalInfo?.title ? `<h2>${cvData.personalInfo.title}</h2>` : ""}

              <div class="contact-details">
                ${
                  cvData.personalInfo?.location
                    ? `<div class="contact-item">📍 ${cvData.personalInfo.location}</div>`
                    : ""
                }
                ${
                  cvData.personalInfo?.email
                    ? `<div class="contact-item">✉️ ${cvData.personalInfo.email}</div>`
                    : ""
                }
                ${
                  cvData.personalInfo?.phone
                    ? `<div class="contact-item">📞 ${cvData.personalInfo.phone}</div>`
                    : ""
                }
              </div>

              ${
                cvData.personalInfo?.citizenship ||
                cvData.personalInfo?.workPermitStatus ||
                cvData.personalInfo?.hasDrivingLicense
                  ? `
              <div class="additional-info">
                ${
                  cvData.personalInfo?.citizenship
                    ? `<div class="info-row"><span class="info-label">Citizenship:</span><span>${cvData.personalInfo.citizenship}</span></div>`
                    : ""
                }
                ${
                  cvData.personalInfo?.workPermitStatus
                    ? `<div class="info-row"><span class="info-label">Work Permit:</span><span>${cvData.personalInfo.workPermitStatus}</span></div>`
                    : ""
                }
                ${
                  cvData.personalInfo?.hasDrivingLicense
                    ? `<div class="info-row"><span class="info-label">Driving License:</span><span>Yes</span></div>`
                    : ""
                }
              </div>
              `
                  : ""
              }

              ${
                cvData.personalInfo?.portfolioUrl ||
                cvData.personalInfo?.linkedinUrl ||
                cvData.personalInfo?.githubUrl
                  ? `
              <div class="links">
                ${
                  cvData.personalInfo?.portfolioUrl
                    ? `<a href="${cvData.personalInfo.portfolioUrl}" class="link">🌐 Portfolio</a>`
                    : ""
                }
                ${
                  cvData.personalInfo?.linkedinUrl
                    ? `<a href="${cvData.personalInfo.linkedinUrl}" class="link">💼 LinkedIn</a>`
                    : ""
                }
                ${
                  cvData.personalInfo?.githubUrl
                    ? `<a href="${cvData.personalInfo.githubUrl}" class="link">💻 GitHub</a>`
                    : ""
                }
              </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Professional Summary -->
          ${
            cvData.summary
              ? `
          <div class="section">
            <h3>Professional Summary</h3>
            <p class="summary-text">${cvData.summary}</p>
          </div>
          `
              : ""
          }

          <!-- Work Experience -->
          ${
            cvData.workExperience.length > 0
              ? `
          <div class="section">
            <h3>Work Experience</h3>
            ${cvData.workExperience
              .map(
                (exp) => `
            <div class="experience-item">
              <div class="item-header">
                <div class="item-title">
                  <h4>${exp.jobTitle}</h4>
                  <p class="company-name">${exp.companyName}</p>
                </div>
                <div class="item-dates">
                  📅 ${formatDate(exp.startDate)} - ${exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                  ${exp.location ? `<br>📍 ${exp.location}` : ""}
                </div>
              </div>

              ${
                exp.responsibilities.length > 0
                  ? `
              <div class="responsibilities">
                <div class="list-title">Key Responsibilities:</div>
                <ul>
                  ${exp.responsibilities.map((resp) => `<li>${resp}</li>`).join("")}
                </ul>
              </div>
              `
                  : ""
              }

              ${
                exp.achievements.length > 0
                  ? `
              <div class="achievements">
                <div class="list-title">Key Achievements:</div>
                <ul>
                  ${exp.achievements.map((ach) => `<li>${ach}</li>`).join("")}
                </ul>
              </div>
              `
                  : ""
              }
            </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Education -->
          ${
            cvData.education.length > 0
              ? `
          <div class="section">
            <h3>Education</h3>
            ${cvData.education
              .map(
                (edu) => `
            <div class="education-item">
              <div class="item-header">
                <div class="item-title">
                  <h4>${edu.degreeTitle}</h4>
                  <p class="institution-name">${edu.institutionName}</p>
                  ${edu.fieldOfStudy ? `<p class="field-study">${edu.fieldOfStudy}</p>` : ""}
                  ${edu.gradeGpa ? `<p class="grade">Grade: ${edu.gradeGpa}</p>` : ""}
                </div>
                <div class="item-dates">
                  ${
                    edu.startDate || edu.endDate
                      ? `📅 ${formatDate(edu.startDate)} - ${edu.isOngoing ? "Present" : formatDate(edu.endDate)}`
                      : ""
                  }
                  ${edu.location ? `<br>📍 ${edu.location}` : ""}
                </div>
              </div>
              ${edu.description ? `<p>${edu.description}</p>` : ""}
            </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Skills -->
          ${
            cvData.skills.length > 0
              ? `
          <div class="section">
            <h3>Skills</h3>
            <div class="skills-grid">
              ${Object.entries(
                cvData.skills.reduce((acc, skill) => {
                  const category = skill.category || "Other"
                  if (!acc[category]) acc[category] = []
                  acc[category].push(skill)
                  return acc
                }, {} as Record<string, Skill[]>),
              )
                .map(
                  ([category, skills]) => `
              <div class="skill-category">
                <div class="category-name">${category}</div>
                ${skills
                  .map(
                    (skill) => `
                <div class="skill-item">
                  <span>${skill.skillName}</span>
                  <span>${skill.proficiencyLevel}</span>
                </div>
                `,
                  )
                  .join("")}
              </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- Languages -->
          ${
            cvData.languages.length > 0
              ? `
          <div class="section">
            <h3>Languages</h3>
            <div class="languages-grid">
              ${cvData.languages
                .map(
                  (lang) => `
              <div class="language-item">
                <span class="lang-name">${lang.languageName}</span>
                <span class="lang-level"> (${lang.proficiencyLevel})</span>
                ${lang.certification ? `<div class="lang-cert">${lang.certification}</div>` : ""}
              </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- Certifications -->
          ${
            cvData.certifications.length > 0
              ? `
          <div class="section">
            <h3>Certifications</h3>
            ${cvData.certifications
              .map(
                (cert) => `
            <div class="cert-item">
              <div class="item-header">
                <div class="item-title">
                  <h4>${cert.certificationName}</h4>
                  <p class="org-name">${cert.issuingOrganization}</p>
                  ${cert.credentialId ? `<p class="field-study">ID: ${cert.credentialId}</p>` : ""}
                </div>
                <div class="item-dates">
                  ${
                    cert.issueDate
                      ? `
                  Issued: ${formatDate(cert.issueDate)}
                  ${cert.expiryDate ? `<br>Expires: ${formatDate(cert.expiryDate)}` : ""}
                  `
                      : ""
                  }
                </div>
              </div>
              ${cert.description ? `<p>${cert.description}</p>` : ""}
            </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Projects -->
          ${
            cvData.projects.length > 0
              ? `
          <div class="section">
            <h3>Projects</h3>
            ${cvData.projects
              .map(
                (project) => `
            <div class="project-item">
              <div class="item-header">
                <div class="item-title">
                  <h4>${project.projectName}</h4>
                  ${project.role ? `<p class="company-name">Role: ${project.role}</p>` : ""}
                </div>
                <div class="item-dates">
                  ${
                    project.startDate || project.endDate
                      ? `📅 ${formatDate(project.startDate)} - ${project.isOngoing ? "Present" : formatDate(project.endDate)}`
                      : ""
                  }
                </div>
              </div>
              <p>${project.description}</p>
              ${
                project.technologiesUsed.length > 0
                  ? `
              <div class="technologies">
                <span class="tech-label">Technologies:</span> ${project.technologiesUsed.join(", ")}
              </div>
              `
                  : ""
              }
              ${project.projectUrl ? `<a href="${project.projectUrl}" class="link">View Project</a>` : ""}
            </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }
        </body>
      </html>
    `

    printWindow.document.write(cvHTML)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">CV Preview</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handlePrint} disabled={!cvData} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print / Save as PDF
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloading || !cvData}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : cvData ? (
            <div className="p-8 bg-white text-black" style={{ fontFamily: "Arial, sans-serif" }}>
              {/* Header Section with Photo */}
              <div className="mb-8 flex gap-6">
                {/* Profile Photo */}
                {cvData.personalInfo?.profilePhotoUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={cvData.personalInfo.profilePhotoUrl}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                  </div>
                )}

                {/* Contact Information */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {cvData.personalInfo?.firstName} {cvData.personalInfo?.lastName}
                  </h1>
                  {cvData.personalInfo?.title && (
                    <h2 className="text-xl text-gray-700 mb-4">{cvData.personalInfo.title}</h2>
                  )}

                  {/* Contact Details - Structured Vertically */}
                  <div className="space-y-1.5 text-sm text-gray-700 mb-4">
                    {cvData.personalInfo?.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{cvData.personalInfo.location}</span>
                      </div>
                    )}
                    {cvData.personalInfo?.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{cvData.personalInfo.email}</span>
                      </div>
                    )}
                    {cvData.personalInfo?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{cvData.personalInfo.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Information */}
                  {(cvData.personalInfo?.citizenship ||
                    cvData.personalInfo?.workPermitStatus ||
                    cvData.personalInfo?.hasDrivingLicense) && (
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      {cvData.personalInfo?.citizenship && (
                        <div className="flex items-start">
                          <span className="font-medium min-w-[110px]">Citizenship:</span>
                          <span>{cvData.personalInfo.citizenship}</span>
                        </div>
                      )}
                      {cvData.personalInfo?.workPermitStatus && (
                        <div className="flex items-start">
                          <span className="font-medium min-w-[110px]">Work Permit:</span>
                          <span>{cvData.personalInfo.workPermitStatus}</span>
                        </div>
                      )}
                      {cvData.personalInfo?.hasDrivingLicense && (
                        <div className="flex items-start">
                          <span className="font-medium min-w-[110px]">Driving License:</span>
                          <span>Yes</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  {(cvData.personalInfo?.portfolioUrl ||
                    cvData.personalInfo?.linkedinUrl ||
                    cvData.personalInfo?.githubUrl) && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {cvData.personalInfo?.portfolioUrl && (
                        <a
                          href={cvData.personalInfo.portfolioUrl}
                          className="flex items-center text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Globe className="h-4 w-4 mr-1" />
                          Portfolio
                        </a>
                      )}
                      {cvData.personalInfo?.linkedinUrl && (
                        <a
                          href={cvData.personalInfo.linkedinUrl}
                          className="flex items-center text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="h-4 w-4 mr-1" />
                          LinkedIn
                        </a>
                      )}
                      {cvData.personalInfo?.githubUrl && (
                        <a
                          href={cvData.personalInfo.githubUrl}
                          className="flex items-center text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="h-4 w-4 mr-1" />
                          GitHub
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Summary */}
              {cvData.summary && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">
                    Professional Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{cvData.summary}</p>
                </div>
              )}

              {/* Work Experience */}
              {cvData.workExperience.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Work Experience
                  </h3>
                  <div className="space-y-6">
                    {cvData.workExperience.map((exp, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{exp.jobTitle}</h4>
                            <p className="text-gray-700">{exp.companyName}</p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(exp.startDate)} - {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
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
                              {exp.responsibilities.map((resp, i) => (
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
                              {exp.achievements.map((achievement, i) => (
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
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">Education</h3>
                  <div className="space-y-4">
                    {cvData.education.map((edu, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{edu.degreeTitle}</h4>
                            <p className="text-gray-700">{edu.institutionName}</p>
                            {edu.fieldOfStudy && <p className="text-gray-600 text-sm">{edu.fieldOfStudy}</p>}
                            {edu.gradeGpa && <p className="text-gray-600 text-sm">Grade: {edu.gradeGpa}</p>}
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {(edu.startDate || edu.endDate) && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(edu.startDate)} - {edu.isOngoing ? "Present" : formatDate(edu.endDate)}
                              </div>
                            )}
                            {edu.location && (
                              <div className="flex items-center mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {edu.location}
                              </div>
                            )}
                          </div>
                        </div>
                        {edu.description && <p className="text-gray-700 text-sm mt-2">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(
                      cvData.skills.reduce(
                        (acc, skill) => {
                          const category = skill.category || "Other"
                          if (!acc[category]) acc[category] = []
                          acc[category].push(skill)
                          return acc
                        },
                        {} as Record<string, Skill[]>,
                      ),
                    ).map(([category, skills]) => (
                      <div key={category}>
                        <h4 className="font-medium text-gray-800 mb-2">{category}</h4>
                        <div className="space-y-1">
                          {skills.map((skill, i) => (
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
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">Languages</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {cvData.languages.map((lang, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-gray-800">{lang.languageName}</span>
                        <span className="text-gray-600 ml-2">({lang.proficiencyLevel})</span>
                        {lang.certification && <p className="text-gray-600 text-xs mt-1">{lang.certification}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {cvData.certifications.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Certifications
                  </h3>
                  <div className="space-y-4">
                    {cvData.certifications.map((cert, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{cert.certificationName}</h4>
                            <p className="text-gray-700">{cert.issuingOrganization}</p>
                            {cert.credentialId && <p className="text-gray-600 text-sm">ID: {cert.credentialId}</p>}
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {cert.issueDate && (
                              <div>
                                Issued: {formatDate(cert.issueDate)}
                                {cert.expiryDate && <div>Expires: {formatDate(cert.expiryDate)}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                        {cert.description && <p className="text-gray-700 text-sm mt-2">{cert.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {cvData.projects.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-1">Projects</h3>
                  <div className="space-y-6">
                    {cvData.projects.map((project, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{project.projectName}</h4>
                            {project.role && <p className="text-gray-700 text-sm">Role: {project.role}</p>}
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {(project.startDate || project.endDate) && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(project.startDate)} -{" "}
                                {project.isOngoing ? "Present" : formatDate(project.endDate)}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-2">{project.description}</p>
                        {project.technologiesUsed.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-gray-800 text-sm">Technologies: </span>
                            <span className="text-gray-700 text-sm">{project.technologiesUsed.join(", ")}</span>
                          </div>
                        )}
                        {project.projectUrl && (
                          <a href={project.projectUrl} className="text-blue-600 text-sm hover:underline">
                            View Project
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No CV data found. Please build your CV first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
