"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface ContractorProfileEditFormProps {
  userId: string
  profile: any
}

export function ContractorProfileEditForm({ userId, profile }: ContractorProfileEditFormProps) {
  const router = useRouter()
  const { locale } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    companyName: profile.company_name || "",
    description: profile.description || "",
    industry: profile.industry || "",
    services: profile.services?.join(", ") || "",
    location: profile.location || "",
    phone: profile.phone || "",
    website: profile.website || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    if (!formData.companyName || !formData.industry || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      const servicesArray = formData.services
        ? formData.services.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : []

      const { error: updateError } = await supabase
        .from("contractor_profiles")
        .update({
          company_name: formData.companyName,
          description: formData.description || null,
          industry: formData.industry,
          services: servicesArray.length > 0 ? servicesArray : null,
          location: formData.location,
          phone: formData.phone || null,
          website: formData.website || null,
        })
        .eq("user_id", userId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push(locale === 'pt-BR' ? '/br/dashboard/contractor' : '/dashboard/contractor')
      }, 1500)
    } catch (err: any) {
      console.error("Update error:", err)
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8 bg-slate-800/50 border-slate-700">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Edit Contractor Profile
          </h1>
          <p className="text-slate-400">
            Update your business information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="companyName" className="text-slate-200">Company/Trading Name *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g., Smith Plumbing Services"
              required
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="industry" className="text-slate-200">Industry/Trade *</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Plumbing, Electrical, Construction"
              required
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="services" className="text-slate-200">Services Offered</Label>
            <Input
              id="services"
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              placeholder="e.g., Plumbing, Heating, Boiler Installation (comma separated)"
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
            <p className="text-sm text-slate-400 mt-1">Separate multiple services with commas</p>
          </div>

          <div>
            <Label htmlFor="location" className="text-slate-200">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., London, UK"
              required
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-slate-200">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="website" className="text-slate-200">Website</Label>
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
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">Business Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell us about your business..."
              rows={4}
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm">
              Profile updated successfully! Redirecting...
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
