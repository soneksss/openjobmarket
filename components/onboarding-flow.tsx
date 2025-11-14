"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, Building, MapPin, Plus, X, Mail, AlertTriangle, Home, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import AddressAutoComplete from "@/components/address-autocomplete"
import { LocationData } from "@/lib/location-service"
import { CountrySelector } from "@/components/ui/country-selector"
import { LocationPicker } from "@/components/ui/location-picker"
import { HomeownerOnboardingForm } from "@/components/homeowner-onboarding-form"
import LanguageSelector from "@/components/language-selector"

interface OnboardingFlowProps {
  user: {
    id: string
    email: string
    user_metadata?: any
  }
  isVerificationPending?: boolean
  isEmailVerified?: boolean
}

export default function OnboardingFlow({
  user,
  isVerificationPending = false,
  isEmailVerified = true,
}: OnboardingFlowProps) {
  const router = useRouter()
  const supabase = createClient()

  // Get user type from sign-up metadata, convert "employer" to "company"
  const initialUserType = user.user_metadata?.user_type === "employer" ? "company" : user.user_metadata?.user_type

  // Skip step 1 if user already selected their type during sign-up
  const [step, setStep] = useState(initialUserType ? 2 : 1)
  const [userType, setUserType] = useState<"professional" | "company" | "homeowner" | null>(initialUserType || null)
  const [showResetOption, setShowResetOption] = useState(false)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  // Auto-detect if user should be offered a reset
  useEffect(() => {
    const checkForReset = () => {
      // Show reset option if user has metadata but wrong/inconsistent state
      const shouldReset = (
        // User has metadata but is on step 1 (shouldn't happen normally)
        (initialUserType && step === 1) ||
        // User metadata doesn't match expected values
        (user.user_metadata?.user_type && !["professional", "company", "employer", "homeowner"].includes(user.user_metadata.user_type))
      )

      setShowResetOption(shouldReset)
    }

    checkForReset()
  }, [initialUserType, step, user.user_metadata])

  // Handle user type selection for existing users without metadata
  const handleUserTypeSelection = async (selectedType: "professional" | "company" | "homeowner") => {
    setUserType(selectedType)

    // Update user metadata to ensure consistency
    try {
      await supabase.auth.updateUser({
        data: { user_type: selectedType }
      })
      console.log("Updated user metadata with selected type:", selectedType)
    } catch (error) {
      console.error("Error updating user metadata:", error)
    }

    setStep(2)
  }
  const [loading, setLoading] = useState(false)
  const [verificationReminderDismissed, setVerificationReminderDismissed] = useState(false)
  const [professionalLocationData, setProfessionalLocationData] = useState<LocationData | null>(null)
  const [companyLocationData, setCompanyLocationData] = useState<LocationData | null>(null)
  const [dataPreFilled, setDataPreFilled] = useState(false)

  // Professional form data
  const [professionalData, setProfessionalData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    title: "",
    bio: "",
    experienceLevel: "mid" as "entry" | "mid" | "senior" | "lead" | "executive",
    skills: [] as string[],
    languages: [] as string[],
    portfolioUrl: "",
    websiteUrl: "",
    salaryMin: "",
    salaryMax: "",
    salaryFrequency: "per year" as "per year" | "per day" | "per hour",
    latitude: null as number | null,
    longitude: null as number | null,
    readyToRelocate: false,
    hasDrivingLicence: false,
    hasOwnTransport: false,
    employmentStatus: null as string | null,
    availability: "not_specified" as "available_now" | "available_week" | "available_month" | "not_specified",
    hidePersonalName: false,
  })

  // Company form data
  const [companyData, setCompanyData] = useState({
    companyName: "",
    description: "",
    industry: "",
    companySize: "",
    websiteUrl: "",
    phoneNumber: "",
    registrationNumber: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
    services: [] as string[],
    spokenLanguages: [] as string[],
    priceList: "",
    service24_7: false,
  })

  // UI state for adding services
  const [newService, setNewService] = useState("")

  // Pre-fill form with data from signup (user metadata and users table)
  useEffect(() => {
    const preFillFormData = async () => {
      if (dataPreFilled) return // Only run once

      try {
        // Fetch user data from database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("location, latitude, longitude")
          .eq("id", user.id)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
        }

        // Pre-fill professional form
        if (userType === "professional") {
          setProfessionalData(prev => ({
            ...prev,
            firstName: user.user_metadata?.first_name || "",
            lastName: user.user_metadata?.last_name || "",
            latitude: userData?.latitude || null,
            longitude: userData?.longitude || null,
          }))

          console.log("Pre-filled professional form with signup data")
        }

        // Pre-fill company form
        if (userType === "company") {
          setCompanyData(prev => ({
            ...prev,
            companyName: user.user_metadata?.company_name || "",
            latitude: userData?.latitude || null,
            longitude: userData?.longitude || null,
            location: userData?.location || "",
          }))

          console.log("Pre-filled company form with signup data")
        }

        setDataPreFilled(true)
      } catch (error) {
        console.error("Error pre-filling form data:", error)
      }
    }

    if (userType && step === 2) {
      preFillFormData()
    }
  }, [userType, step, user, dataPreFilled])

  const [newSkill, setNewSkill] = useState("")

  const addSkill = () => {
    if (newSkill.trim() && !professionalData.skills.includes(newSkill.trim())) {
      setProfessionalData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setProfessionalData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setProfessionalData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }))
  }

  const handleLocationClear = () => {
    setProfessionalData((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
    }))
  }

  const handleCompanyLocationSelect = (lat: number, lng: number, address?: string) => {
    setCompanyData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: address || prev.location, // Set location text from address
    }))

    // Also store detailed location data if reverse geocoding provides it
    if (address) {
      setCompanyLocationData({
        latitude: lat,
        longitude: lng,
        formatted_address: address,
        city: null,
        country: null,
      })
    }
  }

  const handleCompanyLocationClear = () => {
    setCompanyData((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
      location: "", // Clear location text
    }))
    setCompanyLocationData(null)
  }

  const clearUserMetadata = async () => {
    try {
      // Clear Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: { user_type: null }
      })

      if (error) {
        console.error("Error clearing user metadata:", error)
        return false
      }

      // Reset local state
      setUserType(null)
      setStep(1)

      // Clear professional data
      setProfessionalData({
        firstName: "",
        lastName: "",
        nickname: "",
        title: "",
        bio: "",
        experienceLevel: "mid" as "entry" | "mid" | "senior" | "lead" | "executive",
        skills: [] as string[],
        languages: [] as string[],
        portfolioUrl: "",
        websiteUrl: "",
        salaryMin: "",
        salaryMax: "",
        salaryFrequency: "per year" as "per year" | "per day" | "per hour",
        latitude: null as number | null,
        longitude: null as number | null,
        readyToRelocate: false,
        hasDrivingLicence: false,
        hasOwnTransport: false,
        employmentStatus: null as string | null,
        availability: "not_specified" as "available_now" | "available_week" | "available_month" | "not_specified",
        hidePersonalName: false,
      })

      // Clear company data
      setCompanyData({
        companyName: "",
        description: "",
        industry: "",
        companySize: "",
        websiteUrl: "",
        phoneNumber: "",
        registrationNumber: "",
        location: "",
        latitude: null as number | null,
        longitude: null as number | null,
        addressLine1: "",
        addressLine2: "",
        city: "",
        county: "",
        postcode: "",
        country: "",
        services: [],
        spokenLanguages: [],
        priceList: "",
        service24_7: false,
      })
      setNewService("")

      // Clear location data
      setProfessionalLocationData(null)
      setCompanyLocationData(null)

      console.log("User metadata cleared successfully")
      return true
    } catch (error) {
      console.error("Error clearing user metadata:", error)
      return false
    }
  }

  const geocodeAddress = async (houseNumber: string, postcode: string, country: string) => {
    if (!houseNumber || !postcode) return null

    try {
      const address = `${houseNumber} ${postcode} ${country}`
      // This is a simplified geocoding - in production you might want to use a proper geocoding service
      // For now, we'll set some basic coordinates based on country
      const countryCoordinates: Record<string, { lat: number; lng: number; city: string }> = {
        'GB': { lat: 51.5074, lng: -0.1278, city: 'London' },
        'US': { lat: 40.7128, lng: -74.0060, city: 'New York' },
        'CA': { lat: 43.6532, lng: -79.3832, city: 'Toronto' },
        'AU': { lat: -33.8688, lng: 151.2093, city: 'Sydney' },
        'DE': { lat: 52.5200, lng: 13.4050, city: 'Berlin' },
        'FR': { lat: 48.8566, lng: 2.3522, city: 'Paris' },
        'ES': { lat: 40.4168, lng: -3.7038, city: 'Madrid' },
        'IT': { lat: 41.9028, lng: 12.4964, city: 'Rome' },
        'NL': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam' },
        'SE': { lat: 59.3293, lng: 18.0686, city: 'Stockholm' },
        'NO': { lat: 59.9139, lng: 10.7522, city: 'Oslo' },
        'DK': { lat: 55.6761, lng: 12.5683, city: 'Copenhagen' },
        'BR': { lat: -23.5505, lng: -46.6333, city: 'São Paulo' },
        'RU': { lat: 55.7558, lng: 37.6176, city: 'Moscow' },
        'IN': { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
      }

      const coords = countryCoordinates[country] || countryCoordinates['GB']
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        city: coords.city,
        country: country,
        formatted_address: address
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  const handleSubmit = async () => {
    if (!userType) return

    // Clear any previous errors
    setError(null)

    // Validate form data before submission
    if (userType === "professional") {
      if (!professionalData.firstName || !professionalData.lastName) {
        setError({
          title: "Missing required fields",
          message: "Please enter your first name and last name."
        })
        return
      }

      // If user wants to hide personal name, require a nickname
      if (professionalData.hidePersonalName && !professionalData.nickname) {
        setError({
          title: "Nickname required",
          message: "Please enter a nickname to use instead of your real name."
        })
        return
      }

      if (!professionalData.latitude || !professionalData.longitude) {
        setError({
          title: "Location required",
          message: "Please select your location on the map. This helps employers find you."
        })
        return
      }

      // Validate salary range
      if (professionalData.salaryMin && professionalData.salaryMax) {
        const min = Number.parseInt(professionalData.salaryMin)
        const max = Number.parseInt(professionalData.salaryMax)
        if (min > max) {
          setError({
            title: "Invalid salary range",
            message: "Minimum salary cannot be greater than maximum salary."
          })
          return
        }
      }
    }

    if (userType === "company") {
      if (!companyData.companyName) {
        setError({
          title: "Missing required field",
          message: "Please enter your company name."
        })
        return
      }
      if (!companyData.industry) {
        setError({
          title: "Missing required field",
          message: "Please enter your company's industry."
        })
        return
      }

      if (!companyData.latitude || !companyData.longitude) {
        setError({
          title: "Location required",
          message: "Please pin your location on the map."
        })
        return
      }
    }

    setLoading(true)

    // Create an abort controller with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.error('[ONBOARDING] Operation timed out after 10 seconds')
    }, 10000) // 10 second timeout

    try {
      console.log("Starting form submission...", {
        userType,
        professionalData: userType === "professional" ? professionalData : null,
        companyData: userType === "company" ? companyData : null
      })

      // First, create the user record with nickname, coordinates, and privacy defaults
      const userData: any = {
        id: user.id,
        email: user.email,
        user_type: userType,
        nickname: userType === "professional" ? professionalData.nickname || null : null,
        latitude: userType === "professional" ? professionalData.latitude : null,
        longitude: userType === "professional" ? professionalData.longitude : null,
      }

      // Set phone visibility to private by default for professionals
      if (userType === "professional") {
        userData.phone_visible = false
      }

      console.log("Upserting user data:", userData)

      const userUpsertPromise = supabase
        .from("users")
        .upsert(userData, {
          onConflict: "id"
        })

      const { error: userError } = await Promise.race([
        userUpsertPromise,
        new Promise<{ error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('User upsert timed out after 10 seconds')), 10000)
        )
      ])

      clearTimeout(timeoutId)

      if (userError) {
        console.error("User upsert error:", userError)
        throw userError
      }

      console.log("User record created successfully")

      if (userType === "professional") {
        // Create professional profile with privacy-first defaults
        const profileData: any = {
          user_id: user.id,
          first_name: professionalData.firstName,
          last_name: professionalData.lastName,
          nickname: professionalData.nickname || null,
          title: professionalData.title,
          bio: professionalData.bio,
          experience_level: professionalData.experienceLevel,
          skills: professionalData.skills,
          spoken_languages: professionalData.languages, // FIXED: Match profile edit field name
          portfolio_url: professionalData.portfolioUrl || null,
          website_url: professionalData.websiteUrl || null,
          salary_min: professionalData.salaryMin ? Number.parseInt(professionalData.salaryMin) : null,
          salary_max: professionalData.salaryMax ? Number.parseInt(professionalData.salaryMax) : null,
          salary_frequency: professionalData.salaryFrequency,
          ready_to_relocate: professionalData.readyToRelocate,
          valid_driving_license: professionalData.hasDrivingLicence, // FIXED: Match profile edit field name
          own_transport: professionalData.hasOwnTransport, // FIXED: Match profile edit field name
          // FIXED: Split employment_status into separate boolean fields
          employed_open_to_offers: professionalData.employmentStatus === 'employed',
          unemployed_seeking: professionalData.employmentStatus === 'unemployed',
          availability: professionalData.availability,
          latitude: professionalData.latitude,
          longitude: professionalData.longitude,
          // Privacy defaults - protect user information by default
          hide_email: true, // Hide email by default
          hide_personal_name: professionalData.hidePersonalName, // Use user's choice from onboarding
          hide_address_details: true, // Show only city, hide street address
          hide_bio: false, // Show bio - needed for search visibility
          hide_professional_title: false, // Show title - needed for search visibility
          hide_portfolio_links: false, // Show links - professionals want to showcase work
        }

        console.log("Professional profile data:", profileData)
        console.log("Employment status value:", professionalData.employmentStatus, "Type:", typeof professionalData.employmentStatus)

        // Try upsert first, fallback to insert if unique constraint doesn't exist yet
        let profileError: any = null

        console.log("Attempting professional profile upsert...")

        // First try upsert (works after migration)
        const professionalUpsertPromise = supabase
          .from("professional_profiles")
          .upsert(profileData, {
            onConflict: "user_id"
          })

        const upsertResult = await Promise.race([
          professionalUpsertPromise,
          new Promise<{ error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Professional profile upsert timed out after 10 seconds')), 10000)
          )
        ])

        const upsertError = upsertResult.error

        if (upsertError && upsertError.message?.includes("no unique or exclusion constraint")) {
          // Fallback to insert if unique constraint doesn't exist (before migration)
          console.log("Unique constraint not found, trying insert...")

          const insertPromise = supabase
            .from("professional_profiles")
            .insert(profileData)

          const insertResult = await Promise.race([
            insertPromise,
            new Promise<{ error: Error }>((_, reject) =>
              setTimeout(() => reject(new Error('Professional profile insert timed out after 10 seconds')), 10000)
            )
          ])

          profileError = insertResult.error
        } else {
          profileError = upsertError
        }

        if (profileError) {
          console.error("Professional profile upsert error:", profileError)
          throw profileError
        }

        console.log("Professional profile created successfully")
        router.push("/dashboard/professional")
      } else {
        // Create company profile
        // Build full_address from address fields
        const addressParts = [
          companyData.addressLine1,
          companyData.addressLine2,
          companyData.city,
          companyData.county,
          companyData.postcode,
          companyData.country
        ].filter(Boolean)
        const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null

        // Auto-generate location from reverse geocoding or use a default
        let displayLocation = "Location on map"
        if (companyLocationData?.city && companyLocationData?.country) {
          displayLocation = `${companyLocationData.city}, ${companyLocationData.country}`
        } else if (companyLocationData?.city) {
          displayLocation = companyLocationData.city
        }

        const profileData: any = {
          user_id: user.id,
          company_name: companyData.companyName,
          description: companyData.description,
          industry: companyData.industry,
          company_size: companyData.companySize,
          website_url: companyData.websiteUrl || null,
          phone_number: companyData.phoneNumber || null,
          registration_number: companyData.registrationNumber || null,
          location: displayLocation,
          full_address: fullAddress,
          latitude: companyData.latitude,
          longitude: companyData.longitude,
          services: companyData.services.length > 0 ? companyData.services : null,
          spoken_languages: companyData.spokenLanguages.length > 0 ? companyData.spokenLanguages : null,
          price_list: companyData.priceList || null,
          service_24_7: companyData.service24_7,
        }

        // Add detailed location data from reverse geocoding if available
        if (companyLocationData) {
          if (companyLocationData.city) profileData.city = companyLocationData.city
          if (companyLocationData.country) profileData.country = companyLocationData.country
          if (companyLocationData.formatted_address) {
            profileData.formatted_address = companyLocationData.formatted_address
          }
        }

        console.log("Creating company profile with data:", {
          company_name: profileData.company_name,
          industry: profileData.industry,
          location: profileData.location,
          registration_number: profileData.registration_number,
          hasLatLng: !!(profileData.latitude && profileData.longitude),
        })

        // Try upsert first, fallback to insert if unique constraint doesn't exist yet
        let profileError: any = null

        console.log("Attempting company profile upsert...")

        // First try upsert (works after migration)
        const companyUpsertPromise = supabase
          .from("company_profiles")
          .upsert(profileData, {
            onConflict: "user_id"
          })

        const upsertResult = await Promise.race([
          companyUpsertPromise,
          new Promise<{ error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Company profile upsert timed out after 10 seconds')), 10000)
          )
        ])

        const upsertError = upsertResult.error

        if (upsertError && upsertError.message?.includes("no unique or exclusion constraint")) {
          // Fallback to insert if unique constraint doesn't exist (before migration)
          console.log("Unique constraint not found, trying insert...")

          const insertPromise = supabase
            .from("company_profiles")
            .insert(profileData)

          const insertResult = await Promise.race([
            insertPromise,
            new Promise<{ error: Error }>((_, reject) =>
              setTimeout(() => reject(new Error('Company profile insert timed out after 10 seconds')), 10000)
            )
          ])

          profileError = insertResult.error
        } else {
          profileError = upsertError
        }

        if (profileError) {
          console.error("Company profile upsert error:", profileError)
          throw profileError
        }

        console.log("Company profile created successfully")
        router.push("/dashboard/company")
      }
    } catch (error: any) {
      console.error("Onboarding error details:", {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })

      let errorMessage = "Something went wrong. Please try again."
      let detailedMessage = ""

      if (error?.message) {
        if (error.message.includes("timed out")) {
          errorMessage = "The operation took too long to complete. This might be a network issue or the database is slow."
          detailedMessage = "Please check your internet connection and try again. If the problem persists, contact support."
        } else if (error.message.includes("column") && error.message.includes("does not exist")) {
          errorMessage = "Database schema error detected. Please contact support to run the required database migration."
          detailedMessage = "The database needs to be updated with missing columns for the onboarding process."
        } else if (error.code === "23505") {
          errorMessage = "A profile with this information already exists. Please contact support if you need to update your existing profile."
        } else if (error.code === "23503") {
          errorMessage = "Database constraint error. Please try again or contact support."
        } else if (error.code === "23514" || error.message.includes("check constraint")) {
          // Check constraint violation
          if (error.message.includes("employment_status")) {
            errorMessage = "Invalid employment status selected."
            detailedMessage = "Please select a valid employment status from the dropdown menu or leave it empty."
          } else if (error.message.includes("availability")) {
            errorMessage = "Invalid availability status selected."
            detailedMessage = "Please select one of the availability options provided."
          } else if (error.message.includes("salary")) {
            errorMessage = "Invalid salary values."
            detailedMessage = "Please ensure minimum salary is less than maximum salary, and both are positive numbers."
          } else {
            errorMessage = "One or more fields contain invalid values."
            detailedMessage = "Please check all form fields and ensure they contain valid data."
          }
        } else if (error.code === "42703") {
          errorMessage = "Database schema is missing required columns. Please contact support to run the database migration."
          detailedMessage = "Error code: 42703 - Column does not exist"
        } else {
          errorMessage = `Error: ${error.message}`
        }
      } else if (error?.code) {
        errorMessage = `Database error (${error.code}). Please contact support if this persists.`
      }

      console.error("Final error message:", errorMessage)
      if (detailedMessage) {
        console.error("Additional details:", detailedMessage)
      }

      // Set error state for UI display
      setError({
        title: errorMessage,
        message: detailedMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      })

      if (error) {
        console.error("Failed to resend verification:", error)
        alert("Failed to resend verification email. Please try again.")
      } else {
        alert("Verification email sent! Please check your inbox and spam folder.")
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      alert("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {showResetOption && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-800">Profile Setup Issue Detected</h3>
                <p className="mt-1 text-sm text-blue-700">
                  We detected some inconsistencies with your profile setup. You can start over with a clean slate.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearUserMetadata}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
                  >
                    Start Over
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResetOption(false)}
                    className="text-blue-600"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isVerificationPending || !isEmailVerified) && !verificationReminderDismissed && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-800">Email Verification Pending</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your account was created successfully, but your email address hasn't been verified yet. Some features
                  may be limited until you verify your email.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResendVerification}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100 bg-transparent"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend verification email
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVerificationReminderDismissed(true)}
                    className="text-amber-600"
                  >
                    Remind me later
                  </Button>
                </div>
                <div className="mt-2 text-xs text-amber-600">
                  <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary rounded-full">
            <Briefcase className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Open Job Market</h1>
        <p className="text-muted-foreground">Let's set up your profile to get started</p>
      </div>

      {/* Step 1: Choose user type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What brings you to Open Job Market?</CardTitle>
            <CardDescription>Choose the option that best describes you</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={userType || ""}
              onValueChange={(value) => setUserType(value as "professional" | "company")}
              className="grid grid-cols-1 gap-4"
            >
              <div>
                <RadioGroupItem value="professional" id="professional" className="peer sr-only" />
                <Label
                  htmlFor="professional"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Briefcase className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">I'm looking for work</div>
                    <div className="text-sm text-muted-foreground">
                      Create a professional profile and find your next opportunity
                    </div>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="company" id="company" className="peer sr-only" />
                <Label
                  htmlFor="company"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Building className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">I'm hiring talent</div>
                    <div className="text-sm text-muted-foreground">
                      Post jobs and find the perfect candidates for your team
                    </div>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="homeowner" id="homeowner" className="peer sr-only" />
                <Label
                  htmlFor="homeowner"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Home className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">I need home services</div>
                    <div className="text-sm text-muted-foreground">
                      Post jobs and find contractors for home projects
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end mt-6">
              <Button onClick={() => userType && handleUserTypeSelection(userType)} disabled={!userType}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Professional Profile */}
      {step === 2 && userType === "professional" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Professional Profile</CardTitle>
            <CardDescription>Tell us about yourself and your career goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error message display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">{error.title}</h4>
                    {error.message && (
                      <p className="text-sm text-red-700">{error.message}</p>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info message about pre-filled data */}
            {dataPreFilled && (professionalData.firstName || professionalData.lastName || professionalData.latitude) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>✓ Good news!</strong> We've pre-filled some fields with information from your signup. You can update them if needed.
                </p>
              </div>
            )}

            {/* Anonymous Jobseeker Checkbox */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:border-green-400 transition-colors">
              <Checkbox
                id="hidePersonalName"
                checked={professionalData.hidePersonalName}
                onCheckedChange={(checked) => setProfessionalData((prev) => ({ ...prev, hidePersonalName: checked as boolean }))}
                className="h-5 w-5 mt-0.5 rounded border-2 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <div className="flex-1">
                <Label htmlFor="hidePersonalName" className="text-base font-semibold cursor-pointer text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Anonymous Jobseeker
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  Your real Name and Surname will be hidden. Only your skills matter. Employers will see your nickname instead.
                </p>
                {professionalData.hidePersonalName && (
                  <div className="mt-3 p-3 bg-white border border-green-300 rounded-md">
                    <Label htmlFor="nickname" className="text-sm font-semibold text-gray-900">
                      Nickname (Required) *
                    </Label>
                    <Input
                      id="nickname"
                      value={professionalData.nickname}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, nickname: e.target.value }))}
                      placeholder="e.g., TechGuru, CodeWizard, DevExpert"
                      className="mt-2 border-2"
                      required={professionalData.hidePersonalName}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      This nickname will be shown to employers instead of your real name. You can change this setting later in your profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-semibold">First Name *</Label>
                  <Input
                    id="firstName"
                    value={professionalData.firstName}
                    onChange={(e) => setProfessionalData((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-semibold">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={professionalData.lastName}
                    onChange={(e) => setProfessionalData((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="border-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="title" className="font-semibold">Professional Title</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Software Engineer"
                value={professionalData.title}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, title: e.target.value }))}
                list="job-titles-list"
                className="border-2"
              />
              <datalist id="job-titles-list">
                {/* Tech & IT */}
                <option value="Software Engineer" />
                <option value="Senior Software Engineer" />
                <option value="Full Stack Developer" />
                <option value="Frontend Developer" />
                <option value="Backend Developer" />
                <option value="Mobile Developer" />
                <option value="DevOps Engineer" />
                <option value="Data Scientist" />
                <option value="Data Analyst" />
                <option value="Database Administrator" />
                <option value="Systems Administrator" />
                <option value="Network Engineer" />
                <option value="Cybersecurity Specialist" />
                <option value="IT Support Specialist" />
                <option value="QA Engineer" />
                <option value="Cloud Architect" />

                {/* Design & Creative */}
                <option value="UX Designer" />
                <option value="UI Designer" />
                <option value="Graphic Designer" />
                <option value="Web Designer" />
                <option value="Product Designer" />
                <option value="Art Director" />
                <option value="Animator" />
                <option value="Video Editor" />
                <option value="Photographer" />
                <option value="Illustrator" />

                {/* Business & Management */}
                <option value="Product Manager" />
                <option value="Project Manager" />
                <option value="Business Analyst" />
                <option value="Management Consultant" />
                <option value="Operations Manager" />
                <option value="General Manager" />
                <option value="CEO" />
                <option value="COO" />
                <option value="Business Development Manager" />

                {/* Sales & Marketing */}
                <option value="Marketing Manager" />
                <option value="Digital Marketing Specialist" />
                <option value="Social Media Manager" />
                <option value="Content Writer" />
                <option value="Copywriter" />
                <option value="SEO Specialist" />
                <option value="Sales Manager" />
                <option value="Sales Representative" />
                <option value="Account Manager" />
                <option value="Brand Manager" />

                {/* Finance & Accounting */}
                <option value="Accountant" />
                <option value="Financial Analyst" />
                <option value="Financial Advisor" />
                <option value="Tax Advisor" />
                <option value="Auditor" />
                <option value="Bookkeeper" />
                <option value="Payroll Specialist" />

                {/* Human Resources */}
                <option value="HR Manager" />
                <option value="HR Specialist" />
                <option value="Recruiter" />
                <option value="Talent Acquisition Specialist" />
                <option value="Training and Development Manager" />

                {/* Healthcare */}
                <option value="Nurse" />
                <option value="Registered Nurse" />
                <option value="Nurse Practitioner" />
                <option value="Doctor" />
                <option value="General Practitioner" />
                <option value="Surgeon" />
                <option value="Dentist" />
                <option value="Pharmacist" />
                <option value="Physiotherapist" />
                <option value="Occupational Therapist" />
                <option value="Paramedic" />
                <option value="Care Worker" />
                <option value="Carer" />
                <option value="Support Worker" />
                <option value="Healthcare Assistant" />
                <option value="Mental Health Nurse" />

                {/* Education */}
                <option value="Teacher" />
                <option value="Primary School Teacher" />
                <option value="Secondary School Teacher" />
                <option value="Teaching Assistant" />
                <option value="Tutor" />
                <option value="Lecturer" />
                <option value="Professor" />
                <option value="Special Education Teacher" />

                {/* Trades & Construction */}
                <option value="Electrician" />
                <option value="Plumber" />
                <option value="Carpenter" />
                <option value="Builder" />
                <option value="General Builder" />
                <option value="Bricklayer" />
                <option value="Plasterer" />
                <option value="Painter and Decorator" />
                <option value="Roofer" />
                <option value="Gas Engineer" />
                <option value="Heating Engineer" />
                <option value="HVAC Technician" />
                <option value="Welder" />
                <option value="Scaffolder" />
                <option value="Groundworker" />
                <option value="Construction Manager" />
                <option value="Site Manager" />
                <option value="Quantity Surveyor" />
                <option value="Civil Engineer" />
                <option value="Structural Engineer" />

                {/* Automotive */}
                <option value="Mechanic" />
                <option value="Auto Mechanic" />
                <option value="Motor Mechanic" />
                <option value="Vehicle Technician" />
                <option value="Automotive Engineer" />

                {/* Hospitality & Catering */}
                <option value="Chef" />
                <option value="Sous Chef" />
                <option value="Cook" />
                <option value="Bartender" />
                <option value="Waiter" />
                <option value="Waitress" />
                <option value="Restaurant Manager" />
                <option value="Hotel Manager" />
                <option value="Housekeeper" />

                {/* Retail & Customer Service */}
                <option value="Retail Manager" />
                <option value="Shop Assistant" />
                <option value="Sales Assistant" />
                <option value="Cashier" />
                <option value="Customer Service Representative" />
                <option value="Call Centre Agent" />

                {/* Logistics & Transport */}
                <option value="Driver" />
                <option value="Delivery Driver" />
                <option value="HGV Driver" />
                <option value="Warehouse Operative" />
                <option value="Forklift Operator" />
                <option value="Logistics Coordinator" />
                <option value="Supply Chain Manager" />

                {/* Legal */}
                <option value="Solicitor" />
                <option value="Lawyer" />
                <option value="Paralegal" />
                <option value="Legal Secretary" />

                {/* Administrative */}
                <option value="Administrative Assistant" />
                <option value="Office Manager" />
                <option value="Personal Assistant" />
                <option value="Secretary" />
                <option value="Receptionist" />

                {/* Other Services */}
                <option value="Cleaner" />
                <option value="Security Guard" />
                <option value="Gardener" />
                <option value="Landscaper" />
                <option value="Hairdresser" />
                <option value="Barber" />
                <option value="Beautician" />
              </datalist>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="bio" className="font-semibold">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your experience and what you're looking for..."
                value={professionalData.bio}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="border-2"
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Your Location *</Label>
              <p className="text-sm text-muted-foreground">
                Select your location on the map. This helps employers find you. You can add your full address later in your CV.
              </p>
              {professionalData.latitude && professionalData.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                  <p className="text-xs text-green-800">
                    ✓ Location selected
                  </p>
                </div>
              )}
              <LocationPicker
                latitude={professionalData.latitude || undefined}
                longitude={professionalData.longitude || undefined}
                onLocationSelect={handleLocationSelect}
                onLocationClear={handleLocationClear}
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Experience Level</Label>
              <RadioGroup
                value={professionalData.experienceLevel}
                onValueChange={(value) =>
                  setProfessionalData((prev) => ({
                    ...prev,
                    experienceLevel: value as typeof prev.experienceLevel,
                  }))
                }
                className="flex flex-wrap gap-4"
              >
                {[
                  { value: "entry", label: "Entry Level" },
                  { value: "mid", label: "Mid Level" },
                  { value: "senior", label: "Senior" },
                  { value: "lead", label: "Lead" },
                  { value: "executive", label: "Executive" },
                ].map((level) => (
                  <div key={level.value} className="flex items-center space-x-2 p-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value={level.value} id={level.value} className="border-2" />
                    <Label htmlFor={level.value} className="cursor-pointer font-medium">{level.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill (e.g., JavaScript, Project Management)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  list="skills-list"
                  className="border-2"
                />
                <datalist id="skills-list">
                  {/* Programming Languages */}
                  <option value="JavaScript" />
                  <option value="TypeScript" />
                  <option value="Python" />
                  <option value="Java" />
                  <option value="C++" />
                  <option value="C#" />
                  <option value="PHP" />
                  <option value="Ruby" />
                  <option value="Go" />
                  <option value="Swift" />
                  <option value="Kotlin" />
                  <option value="Rust" />
                  <option value="R" />
                  <option value="MATLAB" />
                  <option value="Scala" />

                  {/* Web Development */}
                  <option value="HTML" />
                  <option value="CSS" />
                  <option value="React" />
                  <option value="Angular" />
                  <option value="Vue.js" />
                  <option value="Next.js" />
                  <option value="Node.js" />
                  <option value="Express.js" />
                  <option value="Django" />
                  <option value="Flask" />
                  <option value="Laravel" />
                  <option value="WordPress" />
                  <option value="Shopify" />

                  {/* Databases */}
                  <option value="SQL" />
                  <option value="MySQL" />
                  <option value="PostgreSQL" />
                  <option value="MongoDB" />
                  <option value="Redis" />
                  <option value="Oracle" />
                  <option value="Microsoft SQL Server" />

                  {/* Cloud & DevOps */}
                  <option value="AWS" />
                  <option value="Azure" />
                  <option value="Google Cloud" />
                  <option value="Docker" />
                  <option value="Kubernetes" />
                  <option value="Jenkins" />
                  <option value="CI/CD" />
                  <option value="Terraform" />
                  <option value="Linux" />
                  <option value="Git" />
                  <option value="GitHub" />

                  {/* Design Tools */}
                  <option value="Photoshop" />
                  <option value="Illustrator" />
                  <option value="InDesign" />
                  <option value="Figma" />
                  <option value="Sketch" />
                  <option value="Adobe XD" />
                  <option value="After Effects" />
                  <option value="Premiere Pro" />
                  <option value="Canva" />

                  {/* CAD & Technical */}
                  <option value="AutoCAD" />
                  <option value="SolidWorks" />
                  <option value="Revit" />
                  <option value="SketchUp" />
                  <option value="3D Modeling" />

                  {/* Business & Office */}
                  <option value="Microsoft Office" />
                  <option value="Excel" />
                  <option value="PowerPoint" />
                  <option value="Word" />
                  <option value="Google Workspace" />
                  <option value="Data Analysis" />
                  <option value="Data Entry" />
                  <option value="Bookkeeping" />
                  <option value="QuickBooks" />
                  <option value="Sage" />
                  <option value="Xero" />

                  {/* Project Management */}
                  <option value="Project Management" />
                  <option value="Agile" />
                  <option value="Scrum" />
                  <option value="Jira" />
                  <option value="Trello" />
                  <option value="Asana" />
                  <option value="Microsoft Project" />

                  {/* Marketing & Sales */}
                  <option value="Digital Marketing" />
                  <option value="SEO" />
                  <option value="Social Media Marketing" />
                  <option value="Content Marketing" />
                  <option value="Email Marketing" />
                  <option value="Google Analytics" />
                  <option value="Google Ads" />
                  <option value="Facebook Ads" />
                  <option value="Copywriting" />
                  <option value="Sales" />
                  <option value="Negotiation" />

                  {/* Soft Skills */}
                  <option value="Leadership" />
                  <option value="Communication" />
                  <option value="Teamwork" />
                  <option value="Problem Solving" />
                  <option value="Critical Thinking" />
                  <option value="Time Management" />
                  <option value="Adaptability" />
                  <option value="Customer Service" />
                  <option value="Attention to Detail" />
                  <option value="Multitasking" />
                  <option value="Organization" />

                  {/* Trades & Construction */}
                  <option value="Electrical Work" />
                  <option value="Electrical Installation" />
                  <option value="Electrical Testing" />
                  <option value="18th Edition Wiring Regulations" />
                  <option value="Plumbing" />
                  <option value="Gas Fitting" />
                  <option value="Gas Safe Registered" />
                  <option value="Heating Systems" />
                  <option value="Boiler Installation" />
                  <option value="Carpentry" />
                  <option value="Joinery" />
                  <option value="Bricklaying" />
                  <option value="Plastering" />
                  <option value="Rendering" />
                  <option value="Painting and Decorating" />
                  <option value="Roofing" />
                  <option value="Tiling" />
                  <option value="Groundwork" />
                  <option value="Scaffolding" />
                  <option value="Welding" />
                  <option value="CSCS Card" />
                  <option value="First Aid at Work" />
                  <option value="Health and Safety" />
                  <option value="SMSTS" />
                  <option value="SSSTS" />
                  <option value="Forklift Operation" />
                  <option value="IPAF" />

                  {/* Automotive */}
                  <option value="Car Repair" />
                  <option value="Engine Diagnostics" />
                  <option value="MOT Testing" />
                  <option value="Vehicle Maintenance" />
                  <option value="Auto Electrical" />
                  <option value="Bodywork" />
                  <option value="Spray Painting" />

                  {/* Healthcare */}
                  <option value="Patient Care" />
                  <option value="First Aid" />
                  <option value="CPR" />
                  <option value="Medication Administration" />
                  <option value="Care Planning" />
                  <option value="Moving and Handling" />
                  <option value="Safeguarding" />
                  <option value="Dementia Care" />
                  <option value="Mental Health Support" />
                  <option value="Clinical Skills" />
                  <option value="Medical Terminology" />

                  {/* Education */}
                  <option value="Lesson Planning" />
                  <option value="Classroom Management" />
                  <option value="Child Development" />
                  <option value="Special Educational Needs" />
                  <option value="Curriculum Development" />

                  {/* Hospitality */}
                  <option value="Food Preparation" />
                  <option value="Food Safety" />
                  <option value="Menu Planning" />
                  <option value="Customer Relations" />
                  <option value="Cash Handling" />
                  <option value="Bar Management" />
                  <option value="Table Service" />

                  {/* Languages */}
                  <option value="Bilingual" />
                  <option value="Multilingual" />
                  <option value="Translation" />
                  <option value="Interpretation" />

                  {/* Driving */}
                  <option value="Driving Licence - Category B" />
                  <option value="Driving Licence - Category C" />
                  <option value="Driving Licence - Category D" />
                  <option value="Forklift Licence" />
                  <option value="ADR Licence" />
                  <option value="CPC Driver Qualification" />

                  {/* Other Technical */}
                  <option value="Electronics" />
                  <option value="Telecommunications" />
                  <option value="Networking" />
                  <option value="Cybersecurity" />
                  <option value="Quality Assurance" />
                  <option value="Quality Control" />
                  <option value="Lean Manufacturing" />
                  <option value="Six Sigma" />
                </datalist>
                <Button type="button" onClick={addSkill} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {professionalData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Languages</Label>
              <LanguageSelector
                selectedLanguages={professionalData.languages}
                onChange={(languages) => setProfessionalData((prev) => ({ ...prev, languages }))}
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="websiteUrl" className="font-semibold">Personal Website (Optional)</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourwebsite.com"
                value={professionalData.websiteUrl}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setProfessionalData((prev) => ({ ...prev, websiteUrl: `https://${value}` }))
                  }
                }}
                className="border-2"
              />
              <p className="text-xs text-muted-foreground">
                Your personal website or online portfolio
              </p>
            </div>

            {/* Employment Status */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="employmentStatus" className="font-semibold">Employment Status (Optional)</Label>
              <Select
                value={professionalData.employmentStatus ?? undefined}
                onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, employmentStatus: value || null }))}
              >
                <SelectTrigger className="border-2">
                  <SelectValue placeholder="Select employment status (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Availability</Label>
              <RadioGroup
                value={professionalData.availability}
                onValueChange={(value) =>
                  setProfessionalData((prev) => ({
                    ...prev,
                    availability: value as typeof prev.availability,
                  }))
                }
                className="flex flex-col gap-2"
              >
                {[
                  { value: "available_now", label: "Available now" },
                  { value: "available_week", label: "Available within a week" },
                  { value: "available_month", label: "Available within a month" },
                  { value: "not_specified", label: "Not specified" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value={option.value} id={`avail-${option.value}`} className="border-2 w-5 h-5" />
                    <Label htmlFor={`avail-${option.value}`} className="cursor-pointer font-medium flex-1">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Additional Information Checkboxes */}
            <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Additional Information</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="readyToRelocate"
                    checked={professionalData.readyToRelocate}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, readyToRelocate: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="readyToRelocate" className="font-medium cursor-pointer flex-1">
                    Ready to relocate
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="hasDrivingLicence"
                    checked={professionalData.hasDrivingLicence}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, hasDrivingLicence: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="hasDrivingLicence" className="font-medium cursor-pointer flex-1">
                    Have valid driving licence
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="hasOwnTransport"
                    checked={professionalData.hasOwnTransport}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, hasOwnTransport: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="hasOwnTransport" className="font-medium cursor-pointer flex-1">
                    Have own transport
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">Salary Range (£)</Label>

              {/* Frequency selector first */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Frequency</Label>
                <Select
                  value={professionalData.salaryFrequency}
                  onValueChange={(value) => {
                    setProfessionalData((prev) => ({
                      ...prev,
                      salaryFrequency: value as typeof prev.salaryFrequency,
                      // Reset salary values when frequency changes to avoid confusion
                      salaryMin: "",
                      salaryMax: ""
                    }))
                  }}
                >
                  <SelectTrigger className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per year">Per Year</SelectItem>
                    <SelectItem value="per day">Per Day</SelectItem>
                    <SelectItem value="per hour">Per Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dual-handle range slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-600">
                    £{professionalData.salaryMin || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">to</span>
                  <span className="text-sm font-semibold text-blue-600">
                    £{professionalData.salaryMax ||
                      (professionalData.salaryFrequency === "per hour" ? 100 :
                       professionalData.salaryFrequency === "per day" ? 500 :
                       200000)}
                  </span>
                </div>

                {/* Dual range slider container */}
                <div className="relative pt-2 pb-6">
                  {/* Background track */}
                  <div className="absolute w-full h-2 bg-gray-200 rounded-lg top-2"></div>

                  {/* Active range highlight */}
                  <div
                    className="absolute h-2 bg-blue-600 rounded-lg top-2"
                    style={{
                      left: `${((Number(professionalData.salaryMin) || 0) / (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) * 100}%`,
                      right: `${100 - ((Number(professionalData.salaryMax) || (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) / (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) * 100}%`
                    }}
                  ></div>

                  {/* Minimum slider */}
                  <input
                    type="range"
                    min="0"
                    max={
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    }
                    step={
                      professionalData.salaryFrequency === "per hour" ? 1 :
                      professionalData.salaryFrequency === "per day" ? 10 :
                      1000
                    }
                    value={professionalData.salaryMin || 0}
                    onChange={(e) => {
                      const newMin = Number(e.target.value)
                      const currentMax = Number(professionalData.salaryMax) || (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )
                      if (newMin <= currentMax) {
                        setProfessionalData((prev) => ({ ...prev, salaryMin: e.target.value }))
                      }
                    }}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none top-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: professionalData.salaryMin ? 4 : 3 }}
                  />

                  {/* Maximum slider */}
                  <input
                    type="range"
                    min="0"
                    max={
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    }
                    step={
                      professionalData.salaryFrequency === "per hour" ? 1 :
                      professionalData.salaryFrequency === "per day" ? 10 :
                      1000
                    }
                    value={professionalData.salaryMax || (
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    )}
                    onChange={(e) => {
                      const newMax = Number(e.target.value)
                      const currentMin = Number(professionalData.salaryMin) || 0
                      if (newMax >= currentMin) {
                        setProfessionalData((prev) => ({ ...prev, salaryMax: e.target.value }))
                      }
                    }}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none top-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: professionalData.salaryMax ? 5 : 3 }}
                  />
                </div>
              </div>

              {/* Manual input option */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Or enter manually:</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMinManual" className="text-xs text-muted-foreground">Minimum</Label>
                    <Input
                      id="salaryMinManual"
                      type="number"
                      placeholder={
                        professionalData.salaryFrequency === "per hour" ? "15" :
                        professionalData.salaryFrequency === "per day" ? "150" :
                        "30000"
                      }
                      value={professionalData.salaryMin}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMaxManual" className="text-xs text-muted-foreground">Maximum</Label>
                    <Input
                      id="salaryMaxManual"
                      type="number"
                      placeholder={
                        professionalData.salaryFrequency === "per hour" ? "50" :
                        professionalData.salaryFrequency === "per day" ? "300" :
                        "80000"
                      }
                      value={professionalData.salaryMax}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                      className="border-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="portfolioUrl" className="font-semibold">Portfolio URL (Optional)</Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://portfolio.com/yourname"
                value={professionalData.portfolioUrl}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setProfessionalData((prev) => ({ ...prev, portfolioUrl: `https://${value}` }))
                  }
                }}
                className="border-2"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !professionalData.firstName || !professionalData.lastName}
              >
                {loading ? "Creating Profile..." : "Complete Setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Company Profile */}
      {step === 2 && userType === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error message display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">{error.title}</h4>
                    {error.message && (
                      <p className="text-sm text-red-700">{error.message}</p>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info message about pre-filled data */}
            {dataPreFilled && (companyData.companyName || companyData.latitude) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>✓ Good news!</strong> We've pre-filled some fields with information from your signup. You can update them if needed.
                </p>
              </div>
            )}

            {/* Required Section */}
            <div className="space-y-6 pb-6 border-b">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-base font-semibold">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyData.companyName}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, companyName: e.target.value }))}
                  required
                  className="border-2"
                />
              </div>

              {/* Map Location Picker - Required */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Pin Your Location on Map <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select your location on the map. This will be used for searches and to display your city/region.
                </p>
                {companyData.latitude && companyData.longitude ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">
                      <strong>✓ Location pinned on map</strong>
                      {companyLocationData?.city && companyLocationData?.country && (
                        <span className="block mt-1 text-xs">
                          📍 {companyLocationData.city}, {companyLocationData.country}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠ Please pin your location on the map</strong>
                    </p>
                  </div>
                )}
                <LocationPicker
                  latitude={companyData.latitude || undefined}
                  longitude={companyData.longitude || undefined}
                  onLocationSelect={handleCompanyLocationSelect}
                  onLocationClear={handleCompanyLocationClear}
                />
              </div>
            </div>

            {/* Industry - Required */}
            <div className="space-y-2 pb-6 border-b">
              <Label htmlFor="industry" className="text-base font-semibold">Industry <span className="text-red-500">*</span></Label>
              <Input
                id="industry"
                placeholder="e.g. Technology, Healthcare, Construction"
                value={companyData.industry}
                onChange={(e) => setCompanyData((prev) => ({ ...prev, industry: e.target.value }))}
                required
                className="border-2"
              />
            </div>

            {/* Optional Section */}
            <div className="space-y-6 pt-4">
              <h3 className="text-base font-semibold text-muted-foreground">Optional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="description">Company Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your company, mission, and culture..."
                  value={companyData.description}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Company Registration Number (Optional)</Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g. 12345678"
                  value={companyData.registrationNumber}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Your company registration number (if applicable)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g. +44 20 1234 5678"
                  value={companyData.phoneNumber}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Contact number for customers to reach you
                </p>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <Label>Services Offered (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a service (e.g., Electrical installation, Plumbing)"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (newService.trim() && !companyData.services.includes(newService.trim())) {
                          setCompanyData((prev) => ({ ...prev, services: [...prev.services, newService.trim()] }))
                          setNewService("")
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newService.trim() && !companyData.services.includes(newService.trim())) {
                        setCompanyData((prev) => ({ ...prev, services: [...prev.services, newService.trim()] }))
                        setNewService("")
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {companyData.services.map((service) => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1">
                      {service}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setCompanyData((prev) => ({ ...prev, services: prev.services.filter((s) => s !== service) }))}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  List the services your company provides (helps customers find you)
                </p>
              </div>

              {/* Spoken Languages */}
              <div className="space-y-2">
                <Label>Spoken Languages (Optional)</Label>
                <LanguageSelector
                  selectedLanguages={companyData.spokenLanguages}
                  onChange={(languages) => setCompanyData((prev) => ({ ...prev, spokenLanguages: languages }))}
                />
                <p className="text-xs text-muted-foreground">
                  Languages your team can provide services in
                </p>
              </div>

              {/* Price List */}
              <div className="space-y-2">
                <Label htmlFor="priceList">Price List (Optional)</Label>
                <Textarea
                  id="priceList"
                  placeholder="Example:&#10;Standard Electrical Installation: £50-150&#10;Emergency Call-out: £80-200&#10;Kitchen Rewire: £500-1000"
                  value={companyData.priceList}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, priceList: e.target.value }))}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Add common service prices to help customers understand costs. Customers are more likely to contact companies with clear pricing.
                </p>
              </div>

              {/* 24/7 Service */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="service24_7"
                  checked={companyData.service24_7}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, service24_7: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="service24_7" className="text-sm font-normal cursor-pointer">
                  Available 24/7 for emergency services
                </Label>
              </div>
            </div>

            {/* Optional UK Address Fields */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold text-muted-foreground">Company Address (Optional)</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    placeholder="Building number and street"
                    value={companyData.addressLine1 || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Apartment, suite, etc."
                    value={companyData.addressLine2 || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Town/City</Label>
                  <Input
                    id="city"
                    placeholder="e.g. London"
                    value={companyData.city || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    placeholder="e.g. Greater London"
                    value={companyData.county || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, county: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="e.g. SW1A 1AA"
                    value={companyData.postcode || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, postcode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g. United Kingdom"
                    value={companyData.country || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                value={companyData.websiteUrl}
                onChange={(e) => setCompanyData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setCompanyData((prev) => ({ ...prev, websiteUrl: `https://${value}` }))
                  }
                }}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !companyData.companyName || !companyData.industry || (!companyData.latitude || !companyData.longitude)}
              >
                {loading ? "Creating Profile..." : "Complete Setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Homeowner Profile */}
      {step === 2 && userType === "homeowner" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Homeowner Profile</CardTitle>
            <CardDescription>Set up your profile to start posting jobs and finding contractors</CardDescription>
          </CardHeader>
          <CardContent>
            <HomeownerOnboardingForm userId={user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
