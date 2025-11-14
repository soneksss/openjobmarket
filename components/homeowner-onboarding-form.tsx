"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LocationPicker } from "@/components/ui/location-picker"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface HomeownerOnboardingFormProps {
  userId: string
  existingProfile?: any
}

export function HomeownerOnboardingForm({ userId, existingProfile }: HomeownerOnboardingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationWarning, setLocationWarning] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: existingProfile?.first_name || "",
    lastName: existingProfile?.last_name || "",
    phone: existingProfile?.phone || "",
    location: existingProfile?.location || "",
    latitude: existingProfile?.latitude || null,
    longitude: existingProfile?.longitude || null,
    bio: existingProfile?.bio || "",
  })

  // Geocode address to coordinates
  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    if (!address || address.trim().length < 3) return null

    try {
      setIsGeocoding(true)
      setLocationWarning(null)

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      )

      if (!response.ok) {
        throw new Error('Geocoding service unavailable')
      }

      const data = await response.json()

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
      }

      return null
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    } finally {
      setIsGeocoding(false)
    }
  }

  // Handle address input change with debounced geocoding
  const handleAddressChange = async (newAddress: string) => {
    setFormData({ ...formData, location: newAddress })

    // If address is cleared, clear coordinates
    if (!newAddress.trim()) {
      setFormData({ ...formData, location: '', latitude: null, longitude: null })
      setLocationWarning(null)
      return
    }

    // Try to geocode after user stops typing (wait for complete address)
    if (newAddress.length > 10) {
      const coords = await geocodeAddress(newAddress)
      if (coords) {
        setFormData({
          ...formData,
          location: newAddress,
          latitude: coords.lat,
          longitude: coords.lng
        })
        setLocationWarning(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setLocationWarning(null)

    const supabase = createClient()

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    // Check if we have coordinates
    let finalLatitude = formData.latitude
    let finalLongitude = formData.longitude

    if (!finalLatitude || !finalLongitude) {
      // Try to geocode the address one more time
      const coords = await geocodeAddress(formData.location)

      if (coords) {
        // Geocoding succeeded, use these coordinates
        finalLatitude = coords.lat
        finalLongitude = coords.lng
        setFormData({
          ...formData,
          latitude: coords.lat,
          longitude: coords.lng
        })
      } else {
        // Geocoding failed - require map selection
        setLocationWarning("We couldn't find coordinates for this address. Please use the map to pin your exact location.")
        setError("Location coordinates are required. Please select your location on the map below.")
        setIsLoading(false)
        return
      }
    }

    try {
      const profileData = {
        user_id: userId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || null,
        location: formData.location,
        latitude: finalLatitude,
        longitude: finalLongitude,
        bio: formData.bio || null,
        on_market: false,
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("homeowner_profiles")
          .update(profileData)
          .eq("id", existingProfile.id)

        if (updateError) throw updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("homeowner_profiles")
          .insert(profileData)

        if (insertError) throw insertError
      }

      // Update users table
      await supabase
        .from("users")
        .upsert({
          id: userId,
          user_type: "homeowner"
        }, { onConflict: "id" })

      // Redirect to homeowner dashboard
      router.push("/dashboard/homeowner")
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
            Complete Your Homeowner Profile
          </h1>
          <p className="text-gray-600">
            Tell us a bit about yourself to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
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
            <Label htmlFor="location">Address *</Label>
            <div className="relative">
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={async () => {
                  if (formData.location && !formData.latitude) {
                    const coords = await geocodeAddress(formData.location)
                    if (coords) {
                      setFormData({
                        ...formData,
                        latitude: coords.lat,
                        longitude: coords.lng
                      })
                    }
                  }
                }}
                placeholder="e.g., 123 Main Street, London, UK"
                required
              />
              {isGeocoding && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {formData.latitude && formData.longitude && !locationWarning && (
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Location verified: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
              </p>
            )}
            {locationWarning && (
              <p className="text-sm text-amber-600 mt-1">
                {locationWarning}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Enter your full address - we'll automatically find the coordinates
            </p>
          </div>

          <div>
            <Label>Pin Location on Map {!formData.latitude && <span className="text-red-500">*</span>}</Label>
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelect={(lat, lng, address) => {
                setFormData({
                  ...formData,
                  latitude: lat,
                  longitude: lng,
                  location: address || formData.location
                })
                setLocationWarning(null)
              }}
              onLocationClear={() => {
                setFormData({
                  ...formData,
                  latitude: null,
                  longitude: null
                })
              }}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {formData.latitude
                ? "Location set successfully"
                : "If we couldn't find your address automatically, use this to select your location"
              }
            </p>
          </div>

          <div>
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us a bit about yourself..."
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
