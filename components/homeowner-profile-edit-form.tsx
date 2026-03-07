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

interface HomeownerProfileEditFormProps {
  userId: string
  profile: any
}

export function HomeownerProfileEditForm({ userId, profile }: HomeownerProfileEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    phone: profile.phone || "",
    location: profile.location || "",
    bio: profile.bio || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    if (!formData.firstName || !formData.lastName || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          location: formData.location,
          bio: formData.bio || null,
        })
        .eq("user_id", userId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/homeowner")
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
            Edit Homeowner Profile
          </h1>
          <p className="text-slate-400">
            Update your personal information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-slate-200">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="lastName" className="text-slate-200">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
              />
            </div>
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
            <Label htmlFor="bio" className="text-slate-200">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us a bit about yourself..."
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
