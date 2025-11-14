"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Download,
  Eye,
  Mail,
  Phone,
  User,
  MapPin,
  Briefcase,
  Calendar,
  GraduationCap,
  Languages,
  Award,
  Code,
  ExternalLink,
} from "lucide-react"

interface CVData {
  id: string
  summary: string
  citizenship?: string
  workPermitStatus?: string
  hasDrivingLicense?: boolean
  workExperience: Array<{
    id: string
    jobTitle: string
    companyName: string
    location: string
    startDate: string
    endDate: string
    isCurrent: boolean
    responsibilities: string[]
    achievements: string[]
  }>
  education: Array<{
    id: string
    institutionName: string
    degreeTitle: string
    fieldOfStudy: string
    location: string
    startDate: string
    endDate: string
    isOngoing: boolean
    gradeGpa: string
    description: string
  }>
  skills: Array<{
    id: string
    skillName: string
    category: string
    proficiencyLevel: string
    yearsExperience: number
  }>
  languages: Array<{
    id: string
    languageName: string
    proficiencyLevel: string
    certification: string
  }>
  certifications: Array<{
    id: string
    certificationName: string
    issuingOrganization: string
    issueDate: string
    expiryDate: string
    credentialId: string
    credentialUrl: string
    description: string
  }>
  projects: Array<{
    id: string
    projectName: string
    description: string
    technologiesUsed: string[]
    projectUrl: string
    startDate: string
    endDate: string
    isOngoing: boolean
    role: string
  }>
}

interface CVDialogProps {
  cvData: CVData
  displayName: string
  displayEmail: string
  displayPhone: string
  displayAddress: string
  professionalTitle: string
  profilePhotoUrl: string | null
  canSeeEmail: boolean
  hasPrivacyPermission: boolean
  // Optional controlled mode props
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Optional trigger customization
  showTrigger?: boolean
}

export function CVDialog({
  cvData,
  displayName,
  displayEmail,
  displayPhone,
  displayAddress,
  professionalTitle,
  profilePhotoUrl,
  canSeeEmail,
  hasPrivacyPermission,
  open,
  onOpenChange,
  showTrigger = true,
}: CVDialogProps) {
  const formatDateShort = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    // Build CV HTML content
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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
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
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10pt;
              margin-bottom: 15pt;
              position: relative;
            }
            .avatar {
              position: absolute;
              top: 0;
              left: 0;
              width: 50pt;
              height: 50pt;
              border-radius: 50%;
              border: 2px solid #ccc;
            }
            h1 {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 5pt;
            }
            h2 {
              font-size: 14pt;
              font-weight: normal;
              color: #555;
              margin-bottom: 8pt;
            }
            .contact-info {
              font-size: 10pt;
              color: #666;
              margin-top: 5pt;
            }
            .contact-info span {
              margin: 0 10pt;
            }
            .section {
              margin-bottom: 12pt;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 14pt;
              font-weight: bold;
              border-bottom: 1px solid #333;
              margin-bottom: 8pt;
              padding-bottom: 3pt;
            }
            .item {
              margin-bottom: 10pt;
              page-break-inside: avoid;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3pt;
            }
            .item-title {
              font-weight: bold;
            }
            .item-subtitle {
              font-style: italic;
              color: #555;
            }
            .item-date {
              font-size: 10pt;
              color: #666;
            }
            ul {
              margin-left: 20pt;
              margin-top: 3pt;
            }
            li {
              margin-bottom: 2pt;
            }
            .skills-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8pt;
            }
            .skill-category {
              margin-bottom: 5pt;
            }
            .skill-category-name {
              font-weight: bold;
              margin-bottom: 3pt;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${profilePhotoUrl ? `<img src="${profilePhotoUrl}" class="avatar" alt="${displayName}" />` : ''}
            <h1>${displayName}</h1>
            ${professionalTitle ? `<h2>${professionalTitle}</h2>` : ''}
            <div class="contact-info">
              ${displayEmail ? `<span>${displayEmail}</span>` : ''}
              ${displayPhone ? `<span>${displayPhone}</span>` : ''}
              ${displayAddress ? `<span>${displayAddress}</span>` : ''}
            </div>
            ${cvData.citizenship || cvData.workPermitStatus || cvData.hasDrivingLicense ? `
              <div class="contact-info" style="margin-top: 5pt;">
                ${cvData.citizenship ? `<span>Citizenship: ${cvData.citizenship}</span>` : ''}
                ${cvData.workPermitStatus ? `<span>Work Permit: ${cvData.workPermitStatus}</span>` : ''}
                ${cvData.hasDrivingLicense ? `<span>Driving License: Yes</span>` : ''}
              </div>
            ` : ''}
          </div>

          ${cvData.summary ? `
            <div class="section">
              <div class="section-title">Professional Summary</div>
              <p>${cvData.summary}</p>
            </div>
          ` : ''}

          ${cvData.workExperience.length > 0 ? `
            <div class="section">
              <div class="section-title">Work Experience</div>
              ${cvData.workExperience.map(exp => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${exp.jobTitle}</div>
                      <div class="item-subtitle">${exp.companyName}${exp.location ? `, ${exp.location}` : ''}</div>
                    </div>
                    <div class="item-date">
                      ${formatDateShort(exp.startDate)} - ${exp.isCurrent ? 'Present' : formatDateShort(exp.endDate)}
                    </div>
                  </div>
                  ${exp.responsibilities.length > 0 ? `
                    <ul>
                      ${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                  ` : ''}
                  ${exp.achievements.length > 0 ? `
                    <ul>
                      ${exp.achievements.map(a => `<li>${a}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${cvData.education.length > 0 ? `
            <div class="section">
              <div class="section-title">Education</div>
              ${cvData.education.map(edu => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${edu.degreeTitle}</div>
                      <div class="item-subtitle">${edu.institutionName}${edu.location ? `, ${edu.location}` : ''}</div>
                      ${edu.fieldOfStudy ? `<div>${edu.fieldOfStudy}</div>` : ''}
                      ${edu.gradeGpa ? `<div>Grade: ${edu.gradeGpa}</div>` : ''}
                    </div>
                    <div class="item-date">
                      ${formatDateShort(edu.startDate)} - ${edu.isOngoing ? 'Present' : formatDateShort(edu.endDate)}
                    </div>
                  </div>
                  ${edu.description ? `<p style="margin-top: 3pt;">${edu.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${cvData.skills.length > 0 ? `
            <div class="section">
              <div class="section-title">Skills</div>
              <div class="skills-grid">
                ${Object.entries(cvData.skills.reduce((acc: any, skill: any) => {
                  const category = skill.category || 'Other'
                  if (!acc[category]) acc[category] = []
                  acc[category].push(skill)
                  return acc
                }, {} as Record<string, any[]>)).map(([category, skills]: [string, any]) => `
                  <div class="skill-category">
                    <div class="skill-category-name">${category}</div>
                    ${skills.map((s: any) => `<div>${s.skillName} - ${s.proficiencyLevel}</div>`).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${cvData.languages.length > 0 ? `
            <div class="section">
              <div class="section-title">Languages</div>
              ${cvData.languages.map(lang => `
                <span style="margin-right: 15pt;">
                  <strong>${lang.languageName}</strong> (${lang.proficiencyLevel})
                  ${lang.certification ? ` - ${lang.certification}` : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}

          ${cvData.certifications.length > 0 ? `
            <div class="section">
              <div class="section-title">Certifications</div>
              ${cvData.certifications.map(cert => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${cert.certificationName}</div>
                      <div class="item-subtitle">${cert.issuingOrganization}</div>
                      ${cert.credentialId ? `<div style="font-size: 9pt;">ID: ${cert.credentialId}</div>` : ''}
                    </div>
                    <div class="item-date">
                      ${cert.issueDate ? `Issued: ${formatDateShort(cert.issueDate)}` : ''}
                      ${cert.expiryDate ? `<br/>Expires: ${formatDateShort(cert.expiryDate)}` : ''}
                    </div>
                  </div>
                  ${cert.description ? `<p style="margin-top: 3pt;">${cert.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${cvData.projects.length > 0 ? `
            <div class="section">
              <div class="section-title">Projects</div>
              ${cvData.projects.map(proj => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${proj.projectName}</div>
                      ${proj.role ? `<div class="item-subtitle">Role: ${proj.role}</div>` : ''}
                    </div>
                    <div class="item-date">
                      ${formatDateShort(proj.startDate)} - ${proj.isOngoing ? 'Present' : formatDateShort(proj.endDate)}
                    </div>
                  </div>
                  <p style="margin-top: 3pt;">${proj.description}</p>
                  ${proj.technologiesUsed.length > 0 ? `
                    <div style="margin-top: 3pt; font-size: 10pt;">
                      <strong>Technologies:</strong> ${proj.technologiesUsed.join(', ')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `

    printWindow.document.write(cvHTML)
    printWindow.document.close()

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Full CV
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>CV - {displayName}</DialogTitle>
            <DialogDescription>Detailed CV information</DialogDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        </DialogHeader>

        <div className="cv-page bg-white text-black font-serif relative">
          {/* Avatar - Top Left Corner */}
          {profilePhotoUrl && (
            <div className="absolute top-0 left-0">
              <Avatar className="w-16 h-16 border-2 border-gray-300 shadow-sm">
                <AvatarImage src={profilePhotoUrl} alt={displayName} />
                <AvatarFallback className="text-sm">
                  {displayName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* HEADER */}
          <div className="text-center border-b pb-4 mb-6">
            <h1 className="text-4xl font-bold tracking-tight">{displayName}</h1>
            {professionalTitle && <h2 className="text-xl text-gray-700">{professionalTitle}</h2>}
            <div className="flex flex-wrap justify-center gap-6 text-sm mt-2 text-gray-600">
              {displayEmail && (
                <span><Mail className="inline h-4 w-4 mr-1" />{displayEmail}</span>
              )}
              {displayPhone && (
                <span><Phone className="inline h-4 w-4 mr-1" />{displayPhone}</span>
              )}
              {displayAddress && (
                <span><MapPin className="inline h-4 w-4 mr-1" />{displayAddress}</span>
              )}
            </div>
            {(cvData.citizenship || cvData.workPermitStatus || cvData.hasDrivingLicense) && (
              <div className="flex flex-wrap justify-center gap-4 text-sm mt-2 text-gray-600">
                {cvData.citizenship && <span>Citizenship: {cvData.citizenship}</span>}
                {cvData.workPermitStatus && <span>Work Permit: {cvData.workPermitStatus}</span>}
                {cvData.hasDrivingLicense && <span>Driving License: Yes</span>}
              </div>
            )}
          </div>

          {/* SUMMARY */}
          {cvData.summary && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Professional Summary</h3>
              <p className="text-sm leading-relaxed">{cvData.summary}</p>
            </section>
          )}

          {/* WORK EXPERIENCE */}
          {cvData.workExperience.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Work Experience</h3>
              {cvData.workExperience.map((exp) => (
                <div key={exp.id} className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{exp.jobTitle} – {exp.companyName}</span>
                    <span className="text-gray-600">
                      {formatDate(exp.startDate)} – {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside text-sm ml-4 mt-1">
                      {exp.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                  {exp.achievements.length > 0 && (
                    <ul className="list-disc list-inside text-sm ml-4 mt-1">
                      {exp.achievements.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* EDUCATION */}
          {cvData.education.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Education</h3>
              {cvData.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <span className="font-semibold">{edu.degreeTitle}, {edu.institutionName}</span>
                  {edu.fieldOfStudy && <span className="text-sm"> – {edu.fieldOfStudy}</span>}
                  <div className="text-sm text-gray-600">
                    {formatDate(edu.startDate)} – {edu.isOngoing ? "Present" : formatDate(edu.endDate)}
                  </div>
                  {edu.gradeGpa && <div className="text-sm text-gray-600">Grade: {edu.gradeGpa}</div>}
                </div>
              ))}
            </section>
          )}

          {/* SKILLS */}
          {cvData.skills.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Skills</h3>
              <div className="grid grid-cols-2 gap-x-4 text-sm">
                {cvData.skills.map((skill) => (
                  <div key={skill.id}>
                    {skill.skillName} – <span className="text-gray-600">{skill.proficiencyLevel}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LANGUAGES */}
          {cvData.languages && cvData.languages.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Languages</h3>
              <div className="grid grid-cols-2 gap-x-4 text-sm">
                {cvData.languages.map((lang) => (
                  <div key={lang.id}>
                    {lang.languageName} – <span className="text-gray-600">{lang.proficiencyLevel}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CERTIFICATIONS */}
          {cvData.certifications && cvData.certifications.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold border-b mb-2">Certifications</h3>
              {cvData.certifications.map((cert) => (
                <div key={cert.id} className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{cert.certificationName}</span>
                    <span className="text-gray-600">{cert.issuingOrganization}</span>
                  </div>
                  {cert.issueDate && (
                    <div className="text-xs text-gray-600">
                      Issued: {formatDate(cert.issueDate)}
                      {cert.expiryDate && ` | Expires: ${formatDate(cert.expiryDate)}`}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* PROJECTS */}
          {cvData.projects && cvData.projects.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold border-b mb-2">Projects</h3>
              {cvData.projects.map((project) => (
                <div key={project.id} className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{project.projectName}</span>
                    {project.startDate && (
                      <span className="text-gray-600">
                        {formatDate(project.startDate)} – {project.isOngoing ? "Present" : formatDate(project.endDate)}
                      </span>
                    )}
                  </div>
                  {project.role && <div className="text-xs text-gray-600">{project.role}</div>}
                  <p className="text-sm mt-1">{project.description}</p>
                  {project.technologiesUsed && project.technologiesUsed.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Technologies: {project.technologiesUsed.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
