"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface CompanyProfile {
  id: string
  company_name: string
  location: string
}

interface JobBasicsFormProps {
  companyProfile: CompanyProfile
  onClose?: () => void
}

const countries = [
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
]

const locationTypes = [
  { value: "in-person", label: "In person" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
]

export default function JobBasicsForm({ companyProfile, onClose }: JobBasicsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    country: "GB", // Default to UK
    title: "",
    location_type: "",
    location: "",
  })

  const supabase = createClient()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Job title is required"
    }

    if (!formData.location_type) {
      newErrors.location_type = "Job location type is required"
    }

    if ((formData.location_type === "in-person" || formData.location_type === "hybrid") && !formData.location.trim()) {
      newErrors.location = "Job location is required for in-person and hybrid positions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      console.log("[v0] Creating draft job with data:", formData)
      console.log("[v0] Company profile:", companyProfile)

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      const jobData = {
        company_id: companyProfile.id,
        country: formData.country,
        title: formData.title.trim(),
        location_type: formData.location_type,
        location: formData.location.trim() || null,
        status: "draft",
        is_active: false, // Draft jobs are inactive by default
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Inserting job data:", jobData)

      const { data, error } = await supabase.from("jobs").insert(jobData).select().single()

      if (error) {
        console.error("[v0] Error creating job:", error)
        throw error
      }

      console.log("[v0] Job created successfully:", data)

      // Redirect to job description form (next step)
      router.push(`/jobs/${data.id}/description`)
    } catch (error) {
      console.error("[v0] Error creating job:", error)
      setErrors({ submit: "Failed to create job. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Open Job Market Logo" width={160} height={53} className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-semibold">Add job basics</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm">
                The job will be in <span className="font-medium">English</span> in{" "}
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                >
                  <SelectTrigger className="inline-flex w-auto h-auto p-0 border-0 bg-transparent text-blue-600 hover:text-blue-700 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Job title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Front-end/Admin"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Job Location Type */}
            <div className="space-y-2">
              <Label htmlFor="location_type" className="text-sm font-medium">
                Job location type *
              </Label>
              <Select
                value={formData.location_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, location_type: value }))}
              >
                <SelectTrigger className={errors.location_type ? "border-red-500" : ""}>
                  <SelectValue placeholder="In person" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_type && <p className="text-sm text-red-500">{errors.location_type}</p>}
            </div>

            {/* Job Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                What is the job location? *
              </Label>
              <p className="text-xs text-muted-foreground">Enter a street address or postcode</p>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder=""
                className={errors.location ? "border-red-500" : ""}
                disabled={formData.location_type === "remote"}
              />
              {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Continue Button */}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? "Creating..." : "Continue →"}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Need help? <button className="text-blue-600 hover:underline">Tell us more</button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">DISCLAIMER</p>
            <div className="flex justify-center space-x-4 mt-2 text-xs text-muted-foreground">
              <button className="hover:underline">Cookie & Privacy Policy</button>
              <button className="hover:underline">Terms of Use</button>
              <button className="hover:underline">Brands</button>
              <button className="hover:underline">Blog</button>
              <button className="hover:underline">Contact</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
