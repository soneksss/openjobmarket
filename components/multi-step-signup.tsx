"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Building2, Briefcase, Home, Wrench, Users, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { MapLocationPicker } from "@/components/map-location-picker"

interface SignupData {
  accountType: "individual" | "company" | null
  roles: {
    jobseeker: boolean
    homeowner: boolean
    employer: boolean
    tradespeople: boolean
  }
  email: string
  password: string
  confirmPassword: string
  // Individual fields
  firstName: string
  lastName: string
  // Company fields
  companyName: string
  phone: string
  location: string
  latitude: number | null
  longitude: number | null
}

export default function MultiStepSignup() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signupData, setSignupData] = useState<SignupData>({
    accountType: null,
    roles: {
      jobseeker: false,
      homeowner: false,
      employer: false,
      tradespeople: false,
    },
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
  })

  const updateSignupData = (updates: Partial<SignupData>) => {
    setSignupData(prev => ({ ...prev, ...updates }))
  }

  const toggleRole = (role: keyof SignupData["roles"]) => {
    setSignupData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: !prev.roles[role]
      }
    }))
  }

  const canProceedFromStep1 = signupData.accountType !== null
  const canProceedFromStep2 = () => {
    const { jobseeker, homeowner, employer, tradespeople } = signupData.roles
    return jobseeker || homeowner || employer || tradespeople
  }

  const validateStep3 = () => {
    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError("Please fill in all required fields")
      return false
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    if (signupData.accountType === "individual" && (!signupData.firstName || !signupData.lastName)) {
      setError("Please enter your full name")
      return false
    }
    if (signupData.accountType === "company" && !signupData.companyName) {
      setError("Please enter your company name")
      return false
    }

    // Location is required for Jobseekers and Tradespeople
    const requiresLocation = signupData.roles.jobseeker || signupData.roles.tradespeople
    if (requiresLocation && (!signupData.latitude || !signupData.longitude)) {
      setError("Please select your location on the map. This is required for jobseekers and tradespeople to be found by employers.")
      return false
    }

    return true
  }

  const handleSignup = async () => {
    if (!validateStep3()) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Determine user_type based on account type and roles
      let userType: string
      if (signupData.accountType === "individual") {
        // For individuals, check which role they selected
        if (signupData.roles.jobseeker) {
          userType = "professional"
        } else if (signupData.roles.homeowner) {
          userType = "homeowner"
        } else {
          userType = "professional" // Default fallback
        }
      } else {
        // For companies, always set as "company"
        userType = "company"
      }

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            account_type: signupData.accountType,
            user_type: userType, // Add user_type to metadata
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            company_name: signupData.companyName,
          },
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error("Failed to create user")

      // Upsert user record with roles and location (insert if not exists, update if exists)
      const { error: userError } = await supabase.from("users").upsert({
        id: authData.user.id,
        email: signupData.email,
        user_type: userType, // Use the same userType as metadata
        account_type: signupData.accountType,
        is_jobseeker: signupData.roles.jobseeker,
        is_homeowner: signupData.roles.homeowner,
        is_employer: signupData.roles.employer,
        is_tradespeople: signupData.roles.tradespeople,
        location: signupData.location || null,
        latitude: signupData.latitude,
        longitude: signupData.longitude,
      }, {
        onConflict: 'id'  // Use id as the conflict resolution key
      })

      if (userError) {
        console.error("Error creating/updating user record:", userError)

        // If user record creation/update fails, try to update the auth metadata at least
        // so onboarding can work with metadata
        if (authData.user) {
          try {
            await supabase.auth.updateUser({
              data: {
                user_type: userType,
                account_type: signupData.accountType
              }
            })
            console.log("Updated auth metadata as fallback")
          } catch (metadataError) {
            console.error("Failed to update metadata:", metadataError)
          }
        }

        // Show warning to user but allow them to continue to onboarding
        console.warn("User created in auth but database record may be incomplete. User can complete setup in onboarding.")
      } else {
        console.log("User record created/updated successfully with location data")
      }

      // Redirect to onboarding to complete profile
      router.push("/onboarding")
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "An error occurred during signup")
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    setError(null)
    if (currentStep === 1 && canProceedFromStep1) {
      // Determine which step 2 to show
      if (signupData.accountType === "individual") {
        setCurrentStep(2) // Step 2A
      } else {
        setCurrentStep(3) // Step 2B (we'll use step 3 for company roles)
      }
    } else if (currentStep === 2 || currentStep === 3) {
      if (canProceedFromStep2()) {
        setCurrentStep(4) // Profile setup
      } else {
        setError("Please select at least one role")
      }
    }
  }

  const prevStep = () => {
    setError(null)
    if (currentStep === 4) {
      // Go back to appropriate role selection
      setCurrentStep(signupData.accountType === "individual" ? 2 : 3)
    } else if (currentStep === 2 || currentStep === 3) {
      setCurrentStep(1)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Account</CardTitle>
        <CardDescription>
          Step {currentStep === 1 ? "1" : currentStep === 4 ? "3" : "2"} of 3
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Account Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Who are you signing up as?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the account type that best describes you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => updateSignupData({ accountType: "individual" })}
                className={`p-6 border-2 rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md ${
                  signupData.accountType === "individual"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <User className="h-12 w-12 mb-3 text-blue-600" />
                <h4 className="font-semibold text-lg mb-2">Individual (Private Person)</h4>
                <p className="text-sm text-muted-foreground">
                  For job seekers and homeowners looking for services
                </p>
                {signupData.accountType === "individual" && (
                  <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-1" />
                    Selected
                  </div>
                )}
              </button>

              <button
                onClick={() => updateSignupData({ accountType: "company" })}
                className={`p-6 border-2 rounded-lg text-left transition-all hover:border-orange-500 hover:shadow-md ${
                  signupData.accountType === "company"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <Building2 className="h-12 w-12 mb-3 text-orange-600" />
                <h4 className="font-semibold text-lg mb-2">Business / Company</h4>
                <p className="text-sm text-muted-foreground">
                  For employers and trade/service companies
                </p>
                {signupData.accountType === "company" && (
                  <div className="mt-3 flex items-center text-orange-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-1" />
                    Selected
                  </div>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep1}
                className="min-w-32"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2A: Individual Roles */}
        {currentStep === 2 && signupData.accountType === "individual" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">What would you like to do on Open Job Market?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can select one or both options below
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => toggleRole("jobseeker")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 cursor-pointer ${
                  signupData.roles.jobseeker
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.jobseeker}
                    onCheckedChange={() => toggleRole("jobseeker")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                      <h4 className="font-semibold">Jobseeker</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Search for jobs or let employers find you
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => toggleRole("homeowner")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-green-500 cursor-pointer ${
                  signupData.roles.homeowner
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.homeowner}
                    onCheckedChange={() => toggleRole("homeowner")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Home className="h-5 w-5 mr-2 text-green-600" />
                      <h4 className="font-semibold">Homeowner</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Post tasks or find tradespeople for your project
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep2()}
                className="min-w-32"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2B: Company Roles */}
        {currentStep === 3 && signupData.accountType === "company" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">What best describes your company?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select one or both options
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => toggleRole("employer")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-purple-500 cursor-pointer ${
                  signupData.roles.employer
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.employer}
                    onCheckedChange={() => toggleRole("employer")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 mr-2 text-purple-600" />
                      <h4 className="font-semibold">Employer</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Post vacancies or search for talent
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => toggleRole("tradespeople")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-orange-500 cursor-pointer ${
                  signupData.roles.tradespeople
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.tradespeople}
                    onCheckedChange={() => toggleRole("tradespeople")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Wrench className="h-5 w-5 mr-2 text-orange-600" />
                      <h4 className="font-semibold">Trades / Service Company</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Offer trade services or find skilled workers
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep2()}
                className="min-w-32"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Setup */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Profile Setup</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete your profile information
              </p>
            </div>

            <div className="space-y-4">
              {signupData.accountType === "individual" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={signupData.firstName}
                      onChange={(e) => updateSignupData({ firstName: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={signupData.lastName}
                      onChange={(e) => updateSignupData({ lastName: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={signupData.companyName}
                    onChange={(e) => updateSignupData({ companyName: e.target.value })}
                    placeholder="ABC Company Ltd"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => updateSignupData({ email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => updateSignupData({ password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => updateSignupData({ confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => updateSignupData({ phone: e.target.value })}
                  placeholder="+44 123 456 7890"
                />
              </div>

              {/* Location picker - Required for Jobseekers and Tradespeople, Optional for Homeowners and Employers */}
              <div>
                {(signupData.roles.jobseeker || signupData.roles.tradespeople) ? (
                  <div className="space-y-2">
                    <Label>
                      Your Location *
                      <span className="text-xs text-muted-foreground ml-2">
                        (Required to be found by employers)
                      </span>
                    </Label>
                    <MapLocationPicker
                      value={
                        signupData.latitude && signupData.longitude
                          ? {
                              latitude: signupData.latitude,
                              longitude: signupData.longitude,
                              address: signupData.location
                            }
                          : null
                      }
                      onChange={(location) => {
                        if (location) {
                          updateSignupData({
                            latitude: location.latitude,
                            longitude: location.longitude,
                            location: location.address
                          })
                        } else {
                          updateSignupData({
                            latitude: null,
                            longitude: null,
                            location: ""
                          })
                        }
                      }}
                      height="350px"
                      placeholder="Click on the map to select your location or search for your address"
                    />
                  </div>
                ) : (signupData.roles.homeowner || signupData.roles.employer) ? (
                  <div className="space-y-2">
                    <Label>
                      Location (Optional)
                      <span className="text-xs text-muted-foreground ml-2">
                        (You can set job location when posting jobs)
                      </span>
                    </Label>
                    <Input
                      id="location"
                      value={signupData.location}
                      onChange={(e) => updateSignupData({ location: e.target.value })}
                      placeholder="London, UK (Optional)"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSignup} disabled={isLoading} className="min-w-32">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
