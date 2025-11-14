"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, User, Building } from "lucide-react"

interface ContractorOnboardingFormProps {
  userId: string
  existingProfile?: any
}

export function ContractorOnboardingForm({ userId, existingProfile }: ContractorOnboardingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    companyName: existingProfile?.company_name || "",
    description: existingProfile?.description || "",
    industry: existingProfile?.industry || "",
    services: existingProfile?.services?.join(", ") || "",
    location: existingProfile?.location || "",
    phone: existingProfile?.phone || "",
    website: existingProfile?.website || "",
    employmentType: existingProfile?.employment_type || "self_employed" as "self_employed" | "company",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Validation
    if (!formData.companyName || !formData.industry || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      // Parse services from comma-separated string
      const servicesArray = formData.services
        ? formData.services.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : []

      const profileData = {
        user_id: userId,
        company_name: formData.companyName,
        description: formData.description || null,
        industry: formData.industry,
        services: servicesArray.length > 0 ? servicesArray : null,
        location: formData.location,
        phone: formData.phone || null,
        website: formData.website || null,
        can_hire: false,
        is_self_employed: formData.employmentType === "self_employed",
        employment_type: formData.employmentType,
        available_247: false,
        available_now: false,
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("contractor_profiles")
          .update(profileData)
          .eq("id", existingProfile.id)

        if (updateError) throw updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("contractor_profiles")
          .insert(profileData)

        if (insertError) throw insertError
      }

      // Update users table
      await supabase
        .from("users")
        .upsert({
          id: userId,
          user_type: "contractor"
        }, { onConflict: "id" })

      // Redirect to contractor dashboard
      router.push("/dashboard/contractor")
      router.refresh()
    } catch (err: any) {
      console.error("Onboarding error:", err)
      setError(err.message || "Failed to complete onboarding")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Tradesperson Profile
          </h1>
          <p className="text-gray-600">
            Tell us about your trade or business to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employment Type Selection */}
          <div className="space-y-3">
            <Label>I am *</Label>
            <RadioGroup
              value={formData.employmentType}
              onValueChange={(value) => setFormData({ ...formData, employmentType: value as "self_employed" | "company" })}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="self_employed" id="self_employed" className="peer sr-only" />
                <Label
                  htmlFor="self_employed"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <User className="mb-3 h-6 w-6" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium leading-none">Self-Employed</p>
                    <p className="text-xs text-muted-foreground">
                      I work independently
                    </p>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="company" id="company" className="peer sr-only" />
                <Label
                  htmlFor="company"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Building className="mb-3 h-6 w-6" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium leading-none">Company</p>
                    <p className="text-xs text-muted-foreground">
                      I represent a company
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="companyName">{formData.employmentType === "self_employed" ? "Trading Name" : "Company Name"} *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder={formData.employmentType === "self_employed" ? "e.g., John Smith Plumbing" : "e.g., Smith Plumbing Services Ltd"}
              required
            />
          </div>

          <div>
            <Label htmlFor="industry">Industry/Trade *</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Plumbing, Electrical, Construction"
              required
            />
          </div>

          <div>
            <Label htmlFor="services">Services Offered</Label>
            <Input
              id="services"
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              placeholder="e.g., Plumbing, Heating, Boiler Installation (comma separated)"
            />
            <p className="text-sm text-gray-500 mt-1">Separate multiple services with commas</p>
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., London, UK"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                  setFormData({ ...formData, website: `https://${value}` })
                }
              }}
              placeholder="https://www.yourwebsite.com"
            />
          </div>

          <div>
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell us about your business..."
              rows={4}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Completing Setup...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}
