import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { professionalId, cvData } = await request.json()

    if (!professionalId || !cvData) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // For now, we'll use a simple HTML to PDF approach
    // In a production environment, you might want to use a library like Puppeteer or jsPDF
    const htmlContent = generateHTMLContent(cvData)

    // Create a simple PDF response using HTML
    // Note: This is a basic implementation. For production, consider using proper PDF libraries
    const response = new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${cvData.personalInfo?.firstName}_${cvData.personalInfo?.lastName}_CV.html"`,
      },
    })

    return response
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

function generateHTMLContent(cvData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${cvData.personalInfo?.firstName} ${cvData.personalInfo?.lastName} - CV</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { margin-bottom: 30px; }
        .name { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
        .title { font-size: 18px; color: #666; margin-bottom: 15px; }
        .contact-info { display: flex; flex-wrap: wrap; gap: 20px; font-size: 14px; color: #666; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px; }
        .experience-item, .education-item, .project-item { margin-bottom: 20px; }
        .item-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .item-title { font-weight: bold; }
        .item-company { color: #666; }
        .item-date { font-size: 14px; color: #666; }
        .item-description { margin-top: 8px; }
        .skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .skill-category { margin-bottom: 10px; }
        .skill-category-title { font-weight: bold; margin-bottom: 5px; }
        ul { margin: 8px 0; padding-left: 20px; }
        li { margin-bottom: 4px; }
        @media print {
            body { margin: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">${cvData.personalInfo?.firstName || ""} ${cvData.personalInfo?.lastName || ""}</div>
        ${cvData.personalInfo?.title ? `<div class="title">${cvData.personalInfo.title}</div>` : ""}
        <div class="contact-info">
            ${cvData.personalInfo?.location ? `<span>📍 ${cvData.personalInfo.location}</span>` : ""}
            ${cvData.personalInfo?.email ? `<span>✉️ ${cvData.personalInfo.email}</span>` : ""}
            ${cvData.personalInfo?.phone ? `<span>📞 ${cvData.personalInfo.phone}</span>` : ""}
            ${cvData.personalInfo?.portfolioUrl ? `<span>🌐 <a href="${cvData.personalInfo.portfolioUrl}">Portfolio</a></span>` : ""}
            ${cvData.personalInfo?.linkedinUrl ? `<span>💼 <a href="${cvData.personalInfo.linkedinUrl}">LinkedIn</a></span>` : ""}
            ${cvData.personalInfo?.githubUrl ? `<span>💻 <a href="${cvData.personalInfo.githubUrl}">GitHub</a></span>` : ""}
        </div>
    </div>

    ${
      cvData.summary
        ? `
    <div class="section">
        <div class="section-title">Professional Summary</div>
        <p>${cvData.summary}</p>
    </div>
    `
        : ""
    }

    ${
      cvData.workExperience?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Work Experience</div>
        ${cvData.workExperience
          .map(
            (exp: any) => `
        <div class="experience-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${exp.jobTitle}</div>
                    <div class="item-company">${exp.companyName}</div>
                </div>
                <div class="item-date">
                    ${formatDate(exp.startDate)} - ${exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                    ${exp.location ? `<br>${exp.location}` : ""}
                </div>
            </div>
            ${
              exp.responsibilities?.length > 0
                ? `
            <div class="item-description">
                <strong>Key Responsibilities:</strong>
                <ul>
                    ${exp.responsibilities.map((resp: string) => `<li>${resp}</li>`).join("")}
                </ul>
            </div>
            `
                : ""
            }
            ${
              exp.achievements?.length > 0
                ? `
            <div class="item-description">
                <strong>Key Achievements:</strong>
                <ul>
                    ${exp.achievements.map((achievement: string) => `<li>${achievement}</li>`).join("")}
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

    ${
      cvData.education?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Education</div>
        ${cvData.education
          .map(
            (edu: any) => `
        <div class="education-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${edu.degreeTitle}</div>
                    <div class="item-company">${edu.institutionName}</div>
                    ${edu.fieldOfStudy ? `<div style="font-size: 14px; color: #666;">${edu.fieldOfStudy}</div>` : ""}
                    ${edu.gradeGpa ? `<div style="font-size: 14px; color: #666;">Grade: ${edu.gradeGpa}</div>` : ""}
                </div>
                <div class="item-date">
                    ${formatDate(edu.startDate)} - ${edu.isOngoing ? "Present" : formatDate(edu.endDate)}
                    ${edu.location ? `<br>${edu.location}` : ""}
                </div>
            </div>
            ${edu.description ? `<div class="item-description">${edu.description}</div>` : ""}
        </div>
        `,
          )
          .join("")}
    </div>
    `
        : ""
    }

    ${
      cvData.skills?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-grid">
            ${Object.entries(
              cvData.skills.reduce((acc: any, skill: any) => {
                const category = skill.category || "Other"
                if (!acc[category]) acc[category] = []
                acc[category].push(skill)
                return acc
              }, {}),
            )
              .map(
                ([category, skills]: [string, unknown]) => `
            <div class="skill-category">
                <div class="skill-category-title">${category}</div>
                ${(skills as any[])
                  .map(
                    (skill) => `
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>${skill.skillName}</span>
                    <span style="color: #666;">${skill.proficiencyLevel}</span>
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

    ${
      cvData.languages?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Languages</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            ${cvData.languages
              .map(
                (lang: any) => `
            <div style="font-size: 14px;">
                <strong>${lang.languageName}</strong> (${lang.proficiencyLevel})
                ${lang.certification ? `<br><span style="color: #666; font-size: 12px;">${lang.certification}</span>` : ""}
            </div>
            `,
              )
              .join("")}
        </div>
    </div>
    `
        : ""
    }

    ${
      cvData.certifications?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Certifications</div>
        ${cvData.certifications
          .map(
            (cert: any) => `
        <div class="experience-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${cert.certificationName}</div>
                    <div class="item-company">${cert.issuingOrganization}</div>
                    ${cert.credentialId ? `<div style="font-size: 14px; color: #666;">ID: ${cert.credentialId}</div>` : ""}
                </div>
                <div class="item-date">
                    ${cert.issueDate ? `Issued: ${formatDate(cert.issueDate)}` : ""}
                    ${cert.expiryDate ? `<br>Expires: ${formatDate(cert.expiryDate)}` : ""}
                </div>
            </div>
            ${cert.description ? `<div class="item-description">${cert.description}</div>` : ""}
        </div>
        `,
          )
          .join("")}
    </div>
    `
        : ""
    }

    ${
      cvData.projects?.length > 0
        ? `
    <div class="section">
        <div class="section-title">Projects</div>
        ${cvData.projects
          .map(
            (project: any) => `
        <div class="project-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${project.projectName}</div>
                    ${project.role ? `<div style="font-size: 14px; color: #666;">Role: ${project.role}</div>` : ""}
                </div>
                <div class="item-date">
                    ${formatDate(project.startDate)} - ${project.isOngoing ? "Present" : formatDate(project.endDate)}
                </div>
            </div>
            <div class="item-description">${project.description}</div>
            ${
              project.technologiesUsed?.length > 0
                ? `
            <div style="margin-top: 8px; font-size: 14px;">
                <strong>Technologies:</strong> ${project.technologiesUsed.join(", ")}
            </div>
            `
                : ""
            }
            ${
              project.projectUrl
                ? `
            <div style="margin-top: 8px;">
                <a href="${project.projectUrl}" style="color: #0066cc;">View Project</a>
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

    <script>
        function formatDate(dateString) {
            if (!dateString) return ''
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        }
        
        // Auto-print when page loads (for PDF generation)
        window.onload = function() {
            setTimeout(function() {
                window.print()
            }, 1000)
        }
    </script>
</body>
</html>
  `
}

function formatDate(dateString: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
}
