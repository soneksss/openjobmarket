"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VerifyOtpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get("email") || ""
  const locale = searchParams?.get("locale")
  const returnUrl = searchParams?.get("returnUrl")

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      router.push("/auth/sign-up")
    }
  }, [email, router])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsVerifying(true)

    try {
      const supabase = createClient()

      // Verify the OTP code
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      })

      if (verifyError) {
        throw verifyError
      }

      if (data.user) {
        console.log("[OTP] User verified successfully:", data.user.id)

        // Create user profile after verification
        const { data: profileResult, error: profileError } = await supabase
          .rpc("complete_user_profile_after_verification", { p_user_id: data.user.id })

        if (profileError) {
          console.error("[OTP] Error creating profile:", profileError)
          // Continue anyway - user can complete profile in onboarding
        } else {
          console.log("[OTP] Profile creation result:", profileResult)
        }

        // Get user role to redirect appropriately
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", data.user.id)
          .single()

        if (userError || !userData) {
          // New user - redirect to home page where they can browse freely
          // They'll be prompted to complete profile when they try protected actions
          console.log("[OTP] New user verified - redirecting to home with onboarding prompt")
          router.push("/?welcome=true")
          return
        }

        // Role-based redirect for users with existing profiles
        const dashboardMap: Record<string, string> = {
          admin: "/admin/dashboard",
          homeowner: "/dashboard/homeowner",
          jobseeker: "/dashboard/professional",
          employer: "/dashboard/company",
          contractor: "/dashboard/contractor",
          company: "/dashboard/company",
          professional: "/dashboard/professional",
        }

        const dashboardRoute = dashboardMap[userData.user_type] || "/?welcome=true"
        router.push(dashboardRoute)
      }
    } catch (err) {
      console.error("[OTP] Verification error:", err)
      setError(err instanceof Error ? err.message : "Invalid or expired code. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    setError(null)
    setResendSuccess(false)
    setIsResending(true)

    try {
      const supabase = createClient()

      // Resend OTP email
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (resendError) {
        throw resendError
      }

      setResendSuccess(true)
      // Clear success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err) {
      console.error("[OTP] Resend error:", err)
      setError(err instanceof Error ? err.message : "Failed to resend code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-base mt-2">
            We've sent a 6-digit verification code to:
            <br />
            <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                required
                autoFocus
                disabled={isVerifying}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md">
                ✓ Verification code resent! Check your email.
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isVerifying ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Didn't receive the code?
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendOtp}
              disabled={isResending}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isResending ? "Resending..." : "Resend Code"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">The code expires in 10 minutes</p>
              <p className="mb-2">Check your spam folder if you don't see it</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              asChild
            >
              <Link href={locale === "pt-BR" && returnUrl ? `/auth/sign-up?locale=pt-BR&returnUrl=${returnUrl}` : "/auth/sign-up"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign Up
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
