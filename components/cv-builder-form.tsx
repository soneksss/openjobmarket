"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CVPreview from "./cv-preview" // Import CVPreview component
import CVConsentModal from "./cv-consent-modal"
import CVSensitiveDataWarning from "./cv-sensitive-data-warning"
import {
  Plus,
  X,
  Save,
  Eye,
  Download,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  Code,
  FolderOpen,
  ArrowLeft,
} from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { FileText } from "lucide-react" // Import FileText icon

interface CVData {
  id?: string
  summary: string
  citizenship: string
  workPermitStatus: string
  hasDrivingLicense: boolean
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

interface InitialProfileData {
  firstName: string
  lastName: string
  title: string
  location: string
  email: string
  phone: string
  bio: string
  skills: string[]
  portfolioUrl: string
  linkedinUrl: string
  githubUrl: string
}

interface CVBuilderFormProps {
  userId: string
  professionalId: string
  initialProfileData: InitialProfileData
}

export default function CVBuilderForm({ professionalId, initialProfileData }: CVBuilderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState("summary")
  const [showPreview, setShowPreview] = useState(false)

  // GDPR/LGPD Compliance
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const [cvData, setCvData] = useState<CVData>({
    summary: "",
    citizenship: "",
    workPermitStatus: "",
    hasDrivingLicense: false,
    workExperience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    projects: [],
  })

  const supabase = createClient()

  // Load existing CV data
  useEffect(() => {
    loadCVData()
  }, [])

  // Check CV consent on mount (GDPR/LGPD compliance)
  useEffect(() => {
    checkCVConsent()
  }, [])

  const checkCVConsent = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('professional_profiles')
        .select('cv_consent_given, cv_source')
        .eq('id', professionalId)
        .maybeSingle()

      if (error) {
        // Columns don't exist yet (migrations not run) - skip consent check
        console.warn("[CV-CONSENT] Consent columns not available yet:", error)
        setConsentGiven(true) // Default to true when feature not available
        setConsentChecked(true)
        return
      }

      if (!profile) {
        // No profile found - skip consent check
        setConsentGiven(true)
        setConsentChecked(true)
        return
      }

      setConsentGiven(profile.cv_consent_given || false)
      setConsentChecked(true)

      // Show consent modal if consent not given
      if (!profile.cv_consent_given) {
        setShowConsentModal(true)
      }

      // If switching from upload to builder, delete uploaded file
      if (profile.cv_source === 'upload') {
        await deleteUploadedCV()
      }
    } catch (error) {
      console.error("[CV-CONSENT] Error:", error)
      setConsentGiven(true) // Default to true on error
      setConsentChecked(true)
    }
  }

  const deleteUploadedCV = async () => {
    try {
      await fetch('/api/cv/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId }),
      })
    } catch (error) {
      console.error("[CV] Error deleting uploaded CV:", error)
    }
  }

  const handleConsentGiven = async () => {
    setConsentGiven(true)
    setShowConsentModal(false)
  }

  const handleConsentDeclined = () => {
    router.push('/dashboard')
  }

  const loadCVData = async () => {
    setLoading(true)
    try {
      // Get CV main record only - fast query
      const { data: cvRecord, error: cvError } = await supabase
        .from("professional_cvs")
        .select("*")
        .eq("professional_id", professionalId)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid errors for new users

      if (cvError) {
        console.error("[CV] Error fetching CV:", cvError)
        // Pre-populate with profile data on error
        setCvData((prev) => ({
          ...prev,
          summary: initialProfileData.bio,
          skills: initialProfileData.skills.map((skillName) => ({
            skillName,
            category: "",
            proficiencyLevel: "",
            yearsExperience: undefined,
          })),
        }))
        setLoading(false)
        return
      }

      if (!cvRecord) {
        // This is normal for first-time users - pre-populate with profile data

        // Pre-fill form with profile information
        setCvData((prev) => ({
          ...prev,
          summary: initialProfileData.bio,
          skills: initialProfileData.skills.map((skillName) => ({
            skillName,
            category: "",
            proficiencyLevel: "",
            yearsExperience: undefined,
          })),
        }))

        setLoading(false)
        return
      }

      if (cvRecord) {
        // Set the basic CV data immediately so form shows
        setCvData({
          id: cvRecord.id,
          summary: cvRecord.summary || "",
          citizenship: cvRecord.citizenship || "",
          workPermitStatus: cvRecord.work_permit_status || "",
          hasDrivingLicense: cvRecord.has_driving_license || false,
          workExperience: [],
          education: [],
          skills: [],
          languages: [],
          certifications: [],
          projects: [],
        })

        // Stop loading state so form becomes interactive
        setLoading(false)

        // Load all sections in parallel in the background
        Promise.all([
          supabase.from("cv_work_experience").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_education").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_skills").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_languages").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_certifications").select("*").eq("cv_id", cvRecord.id).order("display_order"),
          supabase.from("cv_projects").select("*").eq("cv_id", cvRecord.id).order("display_order"),
        ]).then(([workExp, education, skills, languages, certifications, projects]) => {

          // Check for errors in each section
          if (workExp.error) console.warn("[CV] Error loading work experience:", workExp.error)
          if (education.error) console.warn("[CV] Error loading education:", education.error)
          if (skills.error) console.warn("[CV] Error loading skills:", skills.error)
          if (languages.error) console.warn("[CV] Error loading languages:", languages.error)
          if (certifications.error) console.warn("[CV] Error loading certifications:", certifications.error)
          if (projects.error) console.warn("[CV] Error loading projects:", projects.error)

          // Update with full data once loaded
          setCvData({
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
          })
        }).catch((error) => {
          console.error("[CV] Error loading sections in background:", error)
        })
      }
    } catch (error) {
      console.error("[CV] ❌ ERROR in loadCVData:", error)
      console.error("[CV] Error type:", typeof error)
      console.error("[CV] Error message:", error instanceof Error ? error.message : String(error))
      console.error("[CV] Error stack:", error instanceof Error ? error.stack : "N/A")
      // Pre-populate with profile data on error/timeout
      setCvData((prev) => ({
        ...prev,
        summary: initialProfileData.bio,
        skills: initialProfileData.skills.map((skillName, index) => ({
          skillName,
          category: "",
          proficiencyLevel: "",
          yearsExperience: undefined,
        })),
      }))
      setLoading(false)
    }
  }

  const handleSaveClick = () => {
    // Check consent first
    if (!consentGiven) {
      setShowConsentModal(true)
      return
    }

    // Show sensitive data warning before save
    setShowSensitiveWarning(true)
  }

  const handleSensitiveWarningContinue = async () => {
    setShowSensitiveWarning(false)
    await saveCVData()
  }

  const handleSensitiveWarningReview = () => {
    setShowSensitiveWarning(false)
  }

  const saveCVData = async () => {
    setSaving(true)
    try {
      console.log("[CV-SAVE] Starting CV save process...")
      console.log("[CV-SAVE] Professional ID:", professionalId)

      // CRITICAL: Check authentication and session status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[CV-SAVE] Session error:", sessionError)
        alert("⚠️ Authentication error. Please refresh the page and try again.")
        return
      }

      if (!session) {
        console.error("[CV-SAVE] No active session found")
        alert("⚠️ You are not logged in. Please log in again to save your CV.")
        router.push('/auth/login')
        return
      }

      // Check if session is expired or about to expire
      const now = Date.now() / 1000
      if (session.expires_at && session.expires_at < now) {
        console.error("[CV-SAVE] Session expired")
        alert("⚠️ Your session has expired. Please log in again.")
        router.push('/auth/login')
        return
      }

      // Refresh token if it's close to expiring (within 5 minutes)
      if (session.expires_at && session.expires_at - now < 300) {
        console.log("[CV-SAVE] Refreshing session token...")
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error("[CV-SAVE] Token refresh failed:", refreshError)
          alert("⚠️ Failed to refresh your session. Please log in again.")
          router.push('/auth/login')
          return
        }
      }

      console.log("[CV-SAVE] Authentication validated ✓")

      let cvId = cvData.id

      // Create or update main CV record
      if (!cvId) {
        console.log("[CV-SAVE] Creating new CV record...")
        const { data: newCV, error } = await supabase
          .from("professional_cvs")
          .insert({
            professional_id: professionalId,
            summary: cvData.summary,
            citizenship: cvData.citizenship,
            work_permit_status: cvData.workPermitStatus,
            has_driving_license: cvData.hasDrivingLicense,
          })
          .select()
          .single()

        if (error) {
          console.error("[CV-SAVE] Error creating CV:", error)
          if (error.code === 'PGRST301') {
            alert("⚠️ Database connection error. Please check your internet connection and try again.")
          } else if (error.message?.includes('JWT')) {
            alert("⚠️ Authentication token expired. Please refresh the page and try again.")
          } else {
            alert(`⚠️ Failed to create CV: ${error.message || 'Unknown error'}`)
          }
          throw error
        }
        cvId = newCV.id
        console.log("[CV-SAVE] Created CV with ID:", cvId)
      } else {
        console.log("[CV-SAVE] Updating existing CV:", cvId)
        const { error } = await supabase
          .from("professional_cvs")
          .update({
            summary: cvData.summary,
            citizenship: cvData.citizenship,
            work_permit_status: cvData.workPermitStatus,
            has_driving_license: cvData.hasDrivingLicense,
          })
          .eq("id", cvId)

        if (error) {
          console.error("[CV-SAVE] Error updating CV:", error)
          if (error.code === 'PGRST301') {
            alert("⚠️ Database connection error. Please check your internet connection and try again.")
          } else if (error.message?.includes('JWT')) {
            alert("⚠️ Authentication token expired. Please refresh the page and try again.")
          } else {
            alert(`⚠️ Failed to update CV: ${error.message || 'Unknown error'}`)
          }
          throw error
        }
        console.log("[CV-SAVE] Updated CV successfully")
      }

      // Save all sections
      console.log("[CV-SAVE] Saving CV sections...")
      await Promise.all([
        saveWorkExperience(cvId!),
        saveEducation(cvId!),
        saveSkills(cvId!),
        saveLanguages(cvId!),
        saveCertifications(cvId!),
        saveProjects(cvId!),
      ])

      // Update professional_profiles to set cv_source = 'builder'
      console.log("[CV-SAVE] Updating professional profile cv_source...")
      const { error: profileError } = await supabase
        .from("professional_profiles")
        .update({
          cv_source: 'builder',
          cv_sensitive_data_warning_acknowledged: true,
          cv_sensitive_data_warning_acknowledged_at: new Date().toISOString(),
        })
        .eq("id", professionalId)

      if (profileError) {
        console.error("[CV-SAVE] Error updating profile:", profileError)
        // Don't throw - CV is already saved
      }

      setCvData((prev) => ({ ...prev, id: cvId }))
      console.log("[CV-SAVE] CV saved successfully! ✓")
      alert("✅ CV saved successfully!")
    } catch (error) {
      console.error("[CV-SAVE] ❌ Error saving CV:", error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert("⚠️ Network error. Please check your internet connection and try again.")
      } else if (!navigator.onLine) {
        alert("⚠️ You are offline. Please check your internet connection and try again.")
      } else {
        alert(`⚠️ Error saving CV: ${(error as any).message || 'Unknown error occurred'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const saveWorkExperience = async (cvId: string) => {
    // Delete existing entries
    const { error: deleteError } = await supabase.from("cv_work_experience").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting work experience:", deleteError)
      throw new Error(`Failed to delete work experience: ${deleteError.message}`)
    }

    // Insert new entries
    if (cvData.workExperience.length > 0) {
      const entries = cvData.workExperience.map((exp, index) => ({
        cv_id: cvId,
        job_title: exp.jobTitle,
        company_name: exp.companyName,
        location: exp.location,
        start_date: exp.startDate || null, // Convert empty string to null
        end_date: exp.isCurrent ? null : (exp.endDate || null), // Convert empty string to null
        is_current: exp.isCurrent,
        responsibilities: exp.responsibilities,
        achievements: exp.achievements,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_work_experience").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting work experience:", insertError)
        throw new Error(`Failed to insert work experience: ${insertError.message}`)
      }
    }
  }

  const saveEducation = async (cvId: string) => {
    const { error: deleteError } = await supabase.from("cv_education").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting education:", deleteError)
      throw new Error(`Failed to delete education: ${deleteError.message}`)
    }

    if (cvData.education.length > 0) {
      const entries = cvData.education.map((edu, index) => ({
        cv_id: cvId,
        institution_name: edu.institutionName,
        degree_title: edu.degreeTitle,
        field_of_study: edu.fieldOfStudy,
        location: edu.location,
        start_date: edu.startDate || null,
        end_date: edu.isOngoing ? null : edu.endDate || null,
        is_ongoing: edu.isOngoing,
        grade_gpa: edu.gradeGpa,
        description: edu.description,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_education").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting education:", insertError)
        throw new Error(`Failed to insert education: ${insertError.message}`)
      }
    }
  }

  const saveSkills = async (cvId: string) => {
    const { error: deleteError } = await supabase.from("cv_skills").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting skills:", deleteError)
      throw new Error(`Failed to delete skills: ${deleteError.message}`)
    }

    if (cvData.skills.length > 0) {
      const entries = cvData.skills.map((skill, index) => ({
        cv_id: cvId,
        skill_name: skill.skillName,
        category: skill.category,
        proficiency_level: skill.proficiencyLevel,
        years_experience: skill.yearsExperience,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_skills").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting skills:", insertError)
        throw new Error(`Failed to insert skills: ${insertError.message}`)
      }
    }
  }

  const saveLanguages = async (cvId: string) => {
    const { error: deleteError } = await supabase.from("cv_languages").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting languages:", deleteError)
      throw new Error(`Failed to delete languages: ${deleteError.message}`)
    }

    if (cvData.languages.length > 0) {
      const entries = cvData.languages.map((lang, index) => ({
        cv_id: cvId,
        language_name: lang.languageName,
        proficiency_level: lang.proficiencyLevel,
        certification: lang.certification,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_languages").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting languages:", insertError)
        throw new Error(`Failed to insert languages: ${insertError.message}`)
      }
    }
  }

  const saveCertifications = async (cvId: string) => {
    const { error: deleteError } = await supabase.from("cv_certifications").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting certifications:", deleteError)
      throw new Error(`Failed to delete certifications: ${deleteError.message}`)
    }

    if (cvData.certifications.length > 0) {
      const entries = cvData.certifications.map((cert, index) => ({
        cv_id: cvId,
        certification_name: cert.certificationName,
        issuing_organization: cert.issuingOrganization,
        issue_date: cert.issueDate || null,
        expiry_date: cert.expiryDate || null,
        credential_id: cert.credentialId,
        credential_url: cert.credentialUrl,
        description: cert.description,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_certifications").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting certifications:", insertError)
        throw new Error(`Failed to insert certifications: ${insertError.message}`)
      }
    }
  }

  const saveProjects = async (cvId: string) => {
    const { error: deleteError } = await supabase.from("cv_projects").delete().eq("cv_id", cvId)
    if (deleteError) {
      console.error("[CV] Error deleting projects:", deleteError)
      throw new Error(`Failed to delete projects: ${deleteError.message}`)
    }

    if (cvData.projects.length > 0) {
      const entries = cvData.projects.map((proj, index) => ({
        cv_id: cvId,
        project_name: proj.projectName,
        description: proj.description,
        technologies_used: proj.technologiesUsed,
        project_url: proj.projectUrl,
        start_date: proj.startDate || null,
        end_date: proj.isOngoing ? null : proj.endDate || null,
        is_ongoing: proj.isOngoing,
        role: proj.role,
        display_order: index,
      }))

      const { error: insertError } = await supabase.from("cv_projects").insert(entries)
      if (insertError) {
        console.error("[CV] Error inserting projects:", insertError)
        throw new Error(`Failed to insert projects: ${insertError.message}`)
      }
    }
  }

  // Helper functions for adding/removing items
  const addWorkExperience = () => {
    setCvData((prev) => ({
      ...prev,
      workExperience: [
        ...prev.workExperience,
        {
          jobTitle: "",
          companyName: "",
          location: "",
          startDate: "",
          endDate: "",
          isCurrent: false,
          responsibilities: [],
          achievements: [],
        },
      ],
    }))
  }

  const removeWorkExperience = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index),
    }))
  }

  const updateWorkExperience = (index: number, field: keyof WorkExperience, value: any) => {
    setCvData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp)),
    }))
  }

  const addEducation = () => {
    setCvData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          institutionName: "",
          degreeTitle: "",
          fieldOfStudy: "",
          location: "",
          startDate: "",
          endDate: "",
          isOngoing: false,
          gradeGpa: "",
          description: "",
        },
      ],
    }))
  }

  const removeEducation = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu)),
    }))
  }

  const addSkill = () => {
    setCvData((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          skillName: "",
          category: "",
          proficiencyLevel: "",
          yearsExperience: undefined,
        },
      ],
    }))
  }

  const removeSkill = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const updateSkill = (index: number, field: keyof Skill, value: any) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill, i) => (i === index ? { ...skill, [field]: value } : skill)),
    }))
  }

  const addLanguage = () => {
    setCvData((prev) => ({
      ...prev,
      languages: [
        ...prev.languages,
        {
          languageName: "",
          proficiencyLevel: "",
          certification: "",
        },
      ],
    }))
  }

  const removeLanguage = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }))
  }

  const updateLanguage = (index: number, field: keyof Language, value: any) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.map((lang, i) => (i === index ? { ...lang, [field]: value } : lang)),
    }))
  }

  const addCertification = () => {
    setCvData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          certificationName: "",
          issuingOrganization: "",
          issueDate: "",
          expiryDate: "",
          credentialId: "",
          credentialUrl: "",
          description: "",
        },
      ],
    }))
  }

  const removeCertification = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const updateCertification = (index: number, field: keyof Certification, value: any) => {
    setCvData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => (i === index ? { ...cert, [field]: value } : cert)),
    }))
  }

  const addProject = () => {
    setCvData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          projectName: "",
          description: "",
          technologiesUsed: [],
          projectUrl: "",
          startDate: "",
          endDate: "",
          isOngoing: false,
          role: "",
        },
      ],
    }))
  }

  const removeProject = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  const updateProject = (index: number, field: keyof Project, value: any) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.map((proj, i) => (i === index ? { ...proj, [field]: value } : proj)),
    }))
  }

  const handleDownloadPDF = async () => {
    try {
      // First save the CV data
      await saveCVData()

      // Then trigger PDF generation
      const response = await fetch("/api/cv/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          cvData: {
            summary: cvData.summary,
            personalInfo: {
              firstName: "", // Will be populated from profile
              lastName: "", // Will be populated from profile
              title: "",
              location: "",
              email: "",
              phone: "",
              portfolioUrl: "",
              linkedinUrl: "",
              githubUrl: "",
            },
            workExperience: cvData.workExperience,
            education: cvData.education,
            skills: cvData.skills,
            languages: cvData.languages,
            certifications: cvData.certifications,
            projects: cvData.projects,
          },
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `CV_${new Date().toISOString().split("T")[0]}.html`
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
    }
  }

  const sections = [
    { id: "summary", label: "Summary", icon: FileText },
    { id: "work", label: "Work Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Code },
    { id: "languages", label: "Languages", icon: Languages },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "projects", label: "Projects", icon: FolderOpen },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading CV builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <Button variant="ghost" size="sm" asChild className="h-8 sm:h-9">
              <Link href="/dashboard/professional">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </Button>
            <div className="flex-1 sm:flex-initial">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">CV Builder</h1>
              <p className="text-xs sm:text-base text-muted-foreground hidden sm:block">Build your professional CV step by step</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="h-8 sm:h-9 px-2 sm:px-4">
              <Eye className="h-4 w-4" />
              <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm hidden sm:inline">Preview</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-8 sm:h-9 px-2 sm:px-4">
              <Download className="h-4 w-4" />
              <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm hidden sm:inline">Download</span>
            </Button>
            <Button onClick={handleSaveClick} disabled={saving} size="sm" className="h-8 sm:h-9 px-2 sm:px-4">
              <Save className="h-4 w-4" />
              <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">{saving ? "..." : <span className="hidden sm:inline">Save CV</span>}</span>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">CV Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 sm:space-y-2 p-4 sm:p-6 pt-0">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "default" : "ghost"}
                      className="w-full justify-start text-sm sm:text-base h-9 sm:h-10"
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {section.label}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Summary Section */}
            {activeSection === "summary" && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Professional Summary & Personal Information
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Write a brief overview of your professional background and add personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <Label htmlFor="summary" className="text-sm">Summary / About Me</Label>
                      <Textarea
                        id="summary"
                        placeholder="Write a compelling summary of your professional experience, key skills, and career goals..."
                        value={cvData.summary}
                        onChange={(e) => setCvData((prev) => ({ ...prev, summary: e.target.value }))}
                        rows={6}
                        className="mt-1.5 text-sm sm:text-base"
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        Tip: Keep it concise (2-3 sentences) and highlight your most relevant experience
                      </p>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-base sm:text-lg font-medium mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="citizenship" className="text-sm">Citizenship</Label>
                          <Input
                            id="citizenship"
                            placeholder="e.g. British, American, etc."
                            value={cvData.citizenship}
                            onChange={(e) => setCvData((prev) => ({ ...prev, citizenship: e.target.value }))}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="workPermit" className="text-sm">Work Permit Status</Label>
                          <Select
                            value={cvData.workPermitStatus}
                            onValueChange={(value) => setCvData((prev) => ({ ...prev, workPermitStatus: value }))}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Select work permit status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UK Citizen">UK Citizen</SelectItem>
                              <SelectItem value="EU Citizen">EU Citizen</SelectItem>
                              <SelectItem value="Work Visa">Work Visa</SelectItem>
                              <SelectItem value="Student Visa">Student Visa</SelectItem>
                              <SelectItem value="No Permit Required">No Permit Required</SelectItem>
                              <SelectItem value="Require Sponsorship">Require Sponsorship</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-4">
                        <Switch
                          checked={cvData.hasDrivingLicense}
                          onCheckedChange={(checked) => setCvData((prev) => ({ ...prev, hasDrivingLicense: checked }))}
                        />
                        <Label>I have a valid driving license</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Experience Section */}
            {activeSection === "work" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Briefcase className="h-5 w-5 mr-2" />
                        Work Experience
                      </CardTitle>
                      <CardDescription>Add your work history, starting with your most recent position</CardDescription>
                    </div>
                    <Button onClick={addWorkExperience}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {cvData.workExperience.map((exp, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Experience #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeWorkExperience(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Job Title *</Label>
                            <Input
                              placeholder="e.g. Senior Software Engineer"
                              value={exp.jobTitle}
                              onChange={(e) => updateWorkExperience(index, "jobTitle", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Company Name *</Label>
                            <Input
                              placeholder="e.g. Tech Corp Ltd"
                              value={exp.companyName}
                              onChange={(e) => updateWorkExperience(index, "companyName", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Location</Label>
                          <Input
                            placeholder="e.g. London, UK"
                            value={exp.location}
                            onChange={(e) => updateWorkExperience(index, "location", e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <Input
                              type="date"
                              value={exp.startDate}
                              onChange={(e) => updateWorkExperience(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={exp.endDate}
                              onChange={(e) => updateWorkExperience(index, "endDate", e.target.value)}
                              disabled={exp.isCurrent}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={exp.isCurrent}
                            onCheckedChange={(checked) => updateWorkExperience(index, "isCurrent", checked)}
                          />
                          <Label>I currently work here</Label>
                        </div>

                        <div>
                          <Label>Key Responsibilities</Label>
                          <Textarea
                            placeholder="Describe your main responsibilities and duties..."
                            value={exp.responsibilities.join("\n")}
                            onChange={(e) =>
                              updateWorkExperience(
                                index,
                                "responsibilities",
                                e.target.value.split("\n").filter((r) => r.trim()),
                              )
                            }
                            rows={3}
                          />
                          <p className="text-sm text-muted-foreground mt-1">Enter each responsibility on a new line</p>
                        </div>

                        <div>
                          <Label>Key Achievements (Optional)</Label>
                          <Textarea
                            placeholder="Highlight your key achievements and accomplishments..."
                            value={exp.achievements.join("\n")}
                            onChange={(e) =>
                              updateWorkExperience(
                                index,
                                "achievements",
                                e.target.value.split("\n").filter((a) => a.trim()),
                              )
                            }
                            rows={3}
                          />
                          <p className="text-sm text-muted-foreground mt-1">Enter each achievement on a new line</p>
                        </div>
                      </div>
                    ))}

                    {cvData.workExperience.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No work experience added yet</p>
                        <p className="text-sm mb-4">Add your work history to showcase your professional experience</p>
                        <Button onClick={addWorkExperience}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Experience
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            {activeSection === "education" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2" />
                        Education
                      </CardTitle>
                      <CardDescription>Add your educational background and qualifications</CardDescription>
                    </div>
                    <Button onClick={addEducation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {cvData.education.map((edu, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Education #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Institution Name *</Label>
                            <Input
                              placeholder="e.g. University of London"
                              value={edu.institutionName}
                              onChange={(e) => updateEducation(index, "institutionName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Degree Title *</Label>
                            <Input
                              placeholder="e.g. Bachelor of Science"
                              value={edu.degreeTitle}
                              onChange={(e) => updateEducation(index, "degreeTitle", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Field of Study</Label>
                            <Input
                              placeholder="e.g. Computer Science"
                              value={edu.fieldOfStudy}
                              onChange={(e) => updateEducation(index, "fieldOfStudy", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              placeholder="e.g. London, UK"
                              value={edu.location}
                              onChange={(e) => updateEducation(index, "location", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={edu.startDate}
                              onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={edu.endDate}
                              onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                              disabled={edu.isOngoing}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={edu.isOngoing}
                            onCheckedChange={(checked) => updateEducation(index, "isOngoing", checked)}
                          />
                          <Label>I am currently studying here</Label>
                        </div>

                        <div>
                          <Label>Grade / GPA (Optional)</Label>
                          <Input
                            placeholder="e.g. First Class Honours, 3.8 GPA"
                            value={edu.gradeGpa}
                            onChange={(e) => updateEducation(index, "gradeGpa", e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Description (Optional)</Label>
                          <Textarea
                            placeholder="Additional details about your studies, relevant coursework, etc."
                            value={edu.description}
                            onChange={(e) => updateEducation(index, "description", e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}

                    {cvData.education.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No education added yet</p>
                        <p className="text-sm mb-4">Add your educational background and qualifications</p>
                        <Button onClick={addEducation}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Education
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Section */}
            {activeSection === "skills" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Code className="h-5 w-5 mr-2" />
                        Skills
                      </CardTitle>
                      <CardDescription>
                        Add your technical and professional skills with proficiency levels
                      </CardDescription>
                    </div>
                    <Button onClick={addSkill}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skill
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cvData.skills.map((skill, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Skill #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeSkill(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Skill Name *</Label>
                            <Input
                              placeholder="e.g. JavaScript, Project Management"
                              value={skill.skillName}
                              onChange={(e) => updateSkill(index, "skillName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={skill.category}
                              onValueChange={(value) => updateSkill(index, "category", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Programming">Programming</SelectItem>
                                <SelectItem value="Design">Design</SelectItem>
                                <SelectItem value="Management">Management</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Proficiency Level</Label>
                            <Select
                              value={skill.proficiencyLevel}
                              onValueChange={(value) => updateSkill(index, "proficiencyLevel", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                                <SelectItem value="Expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Years of Experience (Optional)</Label>
                            <Input
                              type="number"
                              placeholder="e.g. 3"
                              value={skill.yearsExperience || ""}
                              onChange={(e) =>
                                updateSkill(
                                  index,
                                  "yearsExperience",
                                  e.target.value ? Number.parseInt(e.target.value) : undefined,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {cvData.skills.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No skills added yet</p>
                        <p className="text-sm mb-4">Add your technical and professional skills</p>
                        <Button onClick={addSkill}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Skill
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "languages" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Languages className="h-5 w-5 mr-2" />
                        Languages
                      </CardTitle>
                      <CardDescription>Add languages you speak with proficiency levels</CardDescription>
                    </div>
                    <Button onClick={addLanguage}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cvData.languages.map((language, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Language #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeLanguage(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Language *</Label>
                            <Input
                              placeholder="e.g. English, Spanish, French"
                              value={language.languageName}
                              onChange={(e) => updateLanguage(index, "languageName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Proficiency Level *</Label>
                            <Select
                              value={language.proficiencyLevel}
                              onValueChange={(value) => updateLanguage(index, "proficiencyLevel", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select proficiency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Native">Native</SelectItem>
                                <SelectItem value="Fluent">Fluent</SelectItem>
                                <SelectItem value="Conversational">Conversational</SelectItem>
                                <SelectItem value="Basic">Basic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label>Certification (Optional)</Label>
                          <Input
                            placeholder="e.g. IELTS 8.0, TOEFL 110, DELE B2"
                            value={language.certification}
                            onChange={(e) => updateLanguage(index, "certification", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}

                    {cvData.languages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Languages className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No languages added yet</p>
                        <p className="text-sm mb-4">Add languages you speak to showcase your communication skills</p>
                        <Button onClick={addLanguage}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Language
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "certifications" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        Certifications
                      </CardTitle>
                      <CardDescription>Add your professional certifications and licenses</CardDescription>
                    </div>
                    <Button onClick={addCertification}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {cvData.certifications.map((cert, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Certification #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeCertification(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Certification Name *</Label>
                            <Input
                              placeholder="e.g. AWS Solutions Architect"
                              value={cert.certificationName}
                              onChange={(e) => updateCertification(index, "certificationName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Issuing Organization *</Label>
                            <Input
                              placeholder="e.g. Amazon Web Services"
                              value={cert.issuingOrganization}
                              onChange={(e) => updateCertification(index, "issuingOrganization", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Issue Date</Label>
                            <Input
                              type="date"
                              value={cert.issueDate}
                              onChange={(e) => updateCertification(index, "issueDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Expiry Date (Optional)</Label>
                            <Input
                              type="date"
                              value={cert.expiryDate}
                              onChange={(e) => updateCertification(index, "expiryDate", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Credential ID (Optional)</Label>
                            <Input
                              placeholder="e.g. ABC123456"
                              value={cert.credentialId}
                              onChange={(e) => updateCertification(index, "credentialId", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Credential URL (Optional)</Label>
                            <Input
                              placeholder="e.g. https://verify.example.com/cert/123"
                              value={cert.credentialUrl}
                              onChange={(e) => updateCertification(index, "credentialUrl", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Description (Optional)</Label>
                          <Textarea
                            placeholder="Brief description of what this certification covers..."
                            value={cert.description}
                            onChange={(e) => updateCertification(index, "description", e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}

                    {cvData.certifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No certifications added yet</p>
                        <p className="text-sm mb-4">Add your professional certifications and licenses</p>
                        <Button onClick={addCertification}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Certification
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "projects" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <FolderOpen className="h-5 w-5 mr-2" />
                        Projects
                      </CardTitle>
                      <CardDescription>Showcase your notable projects and achievements</CardDescription>
                    </div>
                    <Button onClick={addProject}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {cvData.projects.map((project, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Project #{index + 1}</h4>
                          <Button variant="ghost" size="sm" onClick={() => removeProject(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Project Name *</Label>
                            <Input
                              placeholder="e.g. E-commerce Platform"
                              value={project.projectName}
                              onChange={(e) => updateProject(index, "projectName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Your Role</Label>
                            <Input
                              placeholder="e.g. Lead Developer, Team Member"
                              value={project.role}
                              onChange={(e) => updateProject(index, "role", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            placeholder="Describe the project, your contributions, and key achievements..."
                            value={project.description}
                            onChange={(e) => updateProject(index, "description", e.target.value)}
                            rows={4}
                          />
                        </div>

                        <div>
                          <Label>Technologies Used</Label>
                          <Textarea
                            placeholder="e.g. React, Node.js, MongoDB, AWS (one per line)"
                            value={project.technologiesUsed.join("\n")}
                            onChange={(e) =>
                              updateProject(
                                index,
                                "technologiesUsed",
                                e.target.value.split("\n").filter((tech) => tech.trim()),
                              )
                            }
                            rows={3}
                          />
                          <p className="text-sm text-muted-foreground mt-1">Enter each technology on a new line</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={project.startDate}
                              onChange={(e) => updateProject(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={project.endDate}
                              onChange={(e) => updateProject(index, "endDate", e.target.value)}
                              disabled={project.isOngoing}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={project.isOngoing}
                            onChange={(checked) => updateProject(index, "isOngoing", checked)}
                          />
                          <Label>This project is ongoing</Label>
                        </div>

                        <div>
                          <Label>Project URL (Optional)</Label>
                          <Input
                            placeholder="e.g. https://github.com/username/project or https://project-demo.com"
                            value={project.projectUrl}
                            onChange={(e) => updateProject(index, "projectUrl", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}

                    {cvData.projects.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-2">No projects added yet</p>
                        <p className="text-sm mb-4">Showcase your notable projects and achievements</p>
                        <Button onClick={addProject}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Project
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* CV Preview Modal */}
      <CVPreview professionalId={professionalId} isOpen={showPreview} onClose={() => setShowPreview(false)} />

      {/* CV Consent Modal (GDPR/LGPD Compliance) */}
      <CVConsentModal
        isOpen={showConsentModal}
        onConsent={handleConsentGiven}
        onDecline={handleConsentDeclined}
        professionalId={professionalId}
      />

      {/* Sensitive Data Warning Modal (GDPR/LGPD Compliance) */}
      <CVSensitiveDataWarning
        isOpen={showSensitiveWarning}
        onContinue={handleSensitiveWarningContinue}
        onReview={handleSensitiveWarningReview}
        professionalId={professionalId}
      />
    </div>
  )
}
