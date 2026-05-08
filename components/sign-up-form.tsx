"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, X, User, Users, Wrench, Home, Eye, EyeOff } from "lucide-react"

interface SignUpFormProps {
  initialUserType?: "professional" | "company" | "contractor" | "homeowner" | null
  error?: string
}

export default function SignUpForm({ initialUserType, error }: SignUpFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userType, setUserType] = useState(initialUserType || "professional")
  const [formError, setFormError] = useState<string | null>(error || null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vacancyEnabled, setVacancyEnabled] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc("get_public_admin_settings").then(({ data }) => {
      if (data) setVacancyEnabled(data.vacancies_jobseekers_enabled ?? true)
    })
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setFormError(null)

    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // Sign up without emailRedirectTo to enable OTP flow
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType,
          },
        },
      })

      // Handle case where user already exists
      if (signUpError && signUpError.message?.includes("User already registered")) {
        console.log("User already exists, checking profile completion...")

        // Try to sign in the existing user to check their profile status
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          // Wrong password or other auth error
          throw new Error("User already exists. Please use the correct password or reset your password.")
        }

        if (signInData.user) {
          // Check if user has complete profiles
          const { data: userData } = await supabase
            .from("users")
            .select("user_type")
            .eq("id", signInData.user.id)
            .single()

          let hasCompleteProfile = false

          if (userData?.user_type === "professional") {
            const { data: professionalProfile } = await supabase
              .from("professional_profiles")
              .select("id, first_name, last_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!(professionalProfile?.first_name && professionalProfile?.last_name)
          } else if (userData?.user_type === "company") {
            const { data: companyProfile } = await supabase
              .from("company_profiles")
              .select("id, company_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!companyProfile?.company_name
          }

          if (hasCompleteProfile) {
            // User has complete profile - redirect to dashboard
            throw new Error("User already exists with a complete profile. Please sign in instead.")
          } else {
            // User exists but profile is incomplete - allow to continue onboarding
            console.log("User exists but profile incomplete, redirecting to onboarding...")
            // Preserve locale when redirecting
            const isOnBrRoute = pathname?.startsWith('/br')
            const onboardingUrl = isOnBrRoute
              ? '/onboarding?locale=pt-BR&returnUrl=/br'
              : '/onboarding'
            router.push(onboardingUrl)
            return
          }
        }
      } else if (signUpError) {
        throw signUpError
      }

      // New user registration successful - redirect to OTP verification
      // Preserve locale when redirecting
      const isOnBrRoute = pathname?.startsWith('/br')
      const otpUrl = isOnBrRoute
        ? `/auth/verify-otp?email=${encodeURIComponent(email)}&locale=pt-BR&returnUrl=/br`
        : `/auth/verify-otp?email=${encodeURIComponent(email)}`
      router.push(otpUrl)
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md relative">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-muted z-10 rounded-full"
      >
        <Link href="/">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Link>
      </Button>

      <CardHeader className="text-center pt-6">
        <CardTitle className="text-2xl">Join Open Job Market</CardTitle>
        <CardDescription>Create your account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          {formError && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {formError}
            </div>
          )}

          {!initialUserType && (
            <div className="space-y-3">
              <Label className="text-2xl font-medium">I am a:</Label>
              <RadioGroup value={userType} onValueChange={(value) => setUserType(value as "company" | "professional" | "contractor" | "homeowner")} className="grid grid-cols-1 gap-3">
                {vacancyEnabled && (
                  <div>
                    <RadioGroupItem value="professional" id="professional" className="peer sr-only" />
                    <Label
                      htmlFor="professional"
                      className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                    >
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Jobseeker / Professional</div>
                        <div className="text-xs text-muted-foreground">Looking for job opportunities</div>
                      </div>
                    </Label>
                  </div>
                )}
                <div>
                  <RadioGroupItem value="company" id="company" className="peer sr-only" />
                  <Label
                    htmlFor="company"
                    className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                  >
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Employer / Company</div>
                      <div className="text-xs text-muted-foreground">Posting jobs and hiring talent</div>
                    </div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="contractor" id="contractor" className="peer sr-only" />
                  <Label
                    htmlFor="contractor"
                    className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                  >
                    <Wrench className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Contractor / Tradesperson</div>
                      <div className="text-xs text-muted-foreground">Offering services to businesses and homeowners</div>
                    </div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="homeowner" id="homeowner" className="peer sr-only" />
                  <Label
                    htmlFor="homeowner"
                    className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                  >
                    <Home className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Homeowner</div>
                      <div className="text-xs text-muted-foreground">Looking for local tradespeople</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
