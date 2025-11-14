"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, MapPin, Calendar, Clock, Zap } from "lucide-react"
import Link from "next/link"

const JOB_CATEGORIES = [
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "painting", label: "Painting & Decorating", icon: "🎨" },
  { value: "gardening", label: "Gardening & Landscaping", icon: "🌱" },
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "carpentry", label: "Carpentry", icon: "🪚" },
  { value: "roofing", label: "Roofing", icon: "🏠" },
  { value: "general", label: "General Repairs", icon: "🔨" },
  { value: "other", label: "Other", icon: "📋" }
]

const URGENCY_LEVELS = [
  { value: "urgent", label: "Urgent", description: "Need help ASAP", icon: Zap, color: "red" },
  { value: "normal", label: "Normal", description: "Within a week", icon: Calendar, color: "blue" },
  { value: "flexible", label: "Flexible", description: "No rush", icon: Clock, color: "green" }
]

interface QuickJobPostFormProps {
  homeownerId: string
  userId: string
}

export function QuickJobPostForm({ homeownerId, userId }: QuickJobPostFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget_min: "",
    budget_max: "",
    location: "",
    urgency: "normal",
    preferred_start_date: "",
    estimated_duration: "",
    preferred_contact: "message"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from("homeowner_jobs")
        .insert({
          homeowner_id: homeownerId,
          user_id: userId,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          location: formData.location,
          urgency: formData.urgency,
          status: "open",
          is_active: true,
          preferred_start_date: formData.preferred_start_date || null,
          estimated_duration: formData.estimated_duration || null,
          preferred_contact: formData.preferred_contact
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Success - redirect to dashboard
      router.push("/dashboard/homeowner?job_posted=true")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to post job")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/homeowner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Job</h1>
          <p className="text-gray-600">
            Describe the task you need help with and we'll connect you with local professionals
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Title */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What do you need done?</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Fix leaking tap in kitchen"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the job, what needs to be done, any specific requirements..."
                  rows={5}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Category */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category *</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {JOB_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: category.value })}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${formData.category === category.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{category.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_min">Minimum Budget (£)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                  placeholder="50"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <Label htmlFor="budget_max">Maximum Budget (£)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  placeholder="200"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Leave blank if you prefer to get quotes from professionals
            </p>
          </Card>

          {/* Location */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <MapPin className="inline w-5 h-5 mr-1" />
              Location *
            </h2>
            <div>
              <Label htmlFor="location">Job Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., London, SW1A 1AA"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter your address or postcode
              </p>
            </div>
          </Card>

          {/* Urgency */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How urgent is this?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {URGENCY_LEVELS.map((urgency) => {
                const Icon = urgency.icon
                return (
                  <button
                    key={urgency.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: urgency.value })}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${formData.urgency === urgency.value
                        ? `border-${urgency.color}-500 bg-${urgency.color}-50`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${formData.urgency === urgency.value ? `text-${urgency.color}-600` : 'text-gray-400'}`} />
                    <div className="font-semibold text-gray-900">{urgency.label}</div>
                    <div className="text-sm text-gray-500">{urgency.description}</div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Timing & Contact */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preferred_start_date">Preferred Start Date (Optional)</Label>
                <Input
                  id="preferred_start_date"
                  type="date"
                  value={formData.preferred_start_date}
                  onChange={(e) => setFormData({ ...formData, preferred_start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="estimated_duration">Estimated Duration (Optional)</Label>
                <Input
                  id="estimated_duration"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                  placeholder="e.g., 1-2 hours, Half day, Full day"
                />
              </div>

              <div>
                <Label htmlFor="preferred_contact">Preferred Contact Method</Label>
                <select
                  id="preferred_contact"
                  value={formData.preferred_contact}
                  onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="message">Message</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard/homeowner">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>

            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Posting Job...
                </>
              ) : (
                "Post Job"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
