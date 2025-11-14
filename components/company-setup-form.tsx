"use client"
import { useState } from "react"
import type React from "react"

import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

type Props = {
  userId: string
}

export default function CompanySetupForm({ userId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    industry: "",
    location: "",
    website_url: "",
    services_text: "", // Temporary text field, will be split into array
  })

  const [showCustomIndustry, setShowCustomIndustry] = useState(false)
  const [customIndustry, setCustomIndustry] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convert services_text to array if provided
      const services = formData.services_text
        ? formData.services_text.split(',').map(s => s.trim()).filter(s => s)
        : null

      const { error } = await supabase.from("company_profiles").insert({
        user_id: userId,
        company_name: formData.company_name,
        description: formData.description,
        industry: formData.industry,
        location: formData.location,
        website_url: formData.website_url || null,
        services: services,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push("/dashboard/company")
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
        <input
          type="text"
          required
          value={formData.company_name}
          onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your company name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
        {!showCustomIndustry ? (
          <select
            required
            value={formData.industry}
            onChange={(e) => {
              const value = e.target.value
              if (value === "Other") {
                setShowCustomIndustry(true)
                setFormData((prev) => ({ ...prev, industry: "" }))
              } else {
                setFormData((prev) => ({ ...prev, industry: value }))
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an industry</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Education">Education</option>
            <option value="Retail">Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Construction">Construction</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Marketing">Marketing</option>
            <option value="Consulting">Consulting</option>
            <option value="Other">Other (Enter manually)</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Enter your industry"
              value={customIndustry}
              onChange={(e) => {
                setCustomIndustry(e.target.value)
                setFormData((prev) => ({ ...prev, industry: e.target.value }))
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => {
                setShowCustomIndustry(false)
                setCustomIndustry("")
                setFormData((prev) => ({ ...prev, industry: "" }))
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Back to List
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Services (Optional)</label>
        <input
          type="text"
          value={formData.services_text}
          onChange={(e) => setFormData((prev) => ({ ...prev, services_text: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. Lightning design, Electrical installation, Maintenance (comma-separated)"
        />
        <p className="text-xs text-gray-500 mt-1">Enter services separated by commas. You can add more later in your profile.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
        <input
          type="text"
          required
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. London, UK"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
        <input
          type="url"
          value={formData.website_url}
          onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
          onBlur={(e) => {
            const value = e.target.value.trim()
            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
              setFormData((prev) => ({ ...prev, website_url: `https://${value}` }))
            }
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://yourcompany.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Description *</label>
        <textarea
          required
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Tell us about your company..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating Profile..." : "Create Company Profile"}
      </button>
    </form>
  )
}
