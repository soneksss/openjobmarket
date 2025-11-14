"use server"

import { createClient, createAdminClient } from "@/lib/server"
import { redirect } from "next/navigation"

// Sign up action
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const userType = formData.get("userType")

  if (!email || !password || !userType) {
    return { error: "Email, password, and user type are required" }
  }

  const mappedUserType = userType.toString() === "employer" ? "company" : userType.toString()
  const supabase = await createClient()

  try {
    console.log("[v0] Starting signup process for:", email.toString())
    console.log("[v0] User type:", mappedUserType)

    const redirectUrl =
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      `${typeof window !== "undefined" ? window.location.origin : "https://your-app-domain.vercel.app"}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          user_type: mappedUserType,
          full_name: "",
          nickname: "",
        },
      },
    })

    if (error) {
      console.error("[v0] Auth signup error:", error)

      if (error.message.includes("User already registered") || error.message.includes("already been registered")) {
        console.log("[v0] User already registered, redirecting to sign-in")
        redirect(`/auth/login?email=${encodeURIComponent(email.toString())}&message=already-registered`)
      }

      if (error.message.includes("rate limit")) {
        return { error: "Too many signup attempts. Please wait a few minutes before trying again." }
      }
      if (error.message.includes("email")) {
        return { error: `Email error: ${error.message}. Please check your email address and try again.` }
      }
      return { error: error.message }
    }

    if (data.user && !data.user.email_confirmed_at) {
      return {
        success:
          "We've sent a confirmation link to your email. Please check your inbox (and spam folder) to activate your account.",
        userId: data.user.id,
        email: data.user.email,
      }
    }

    if (data.user && data.user.email_confirmed_at) {
      redirect("/onboarding")
    }

    return {
      success:
        "We've sent a confirmation link to your email. Please check your inbox (and spam folder) to activate your account.",
      userId: data.user?.id,
      email: data.user?.email,
    }
  } catch (error) {
    console.error("[v0] Unexpected signup error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign out action
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

// Sign in action
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Starting login process for:", email.toString())

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      console.error("[v0] Auth login error:", error)
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Login details are not correct. Please try again." }
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "Please check your email and click the confirmation link before logging in." }
      }
      return { error: error.message }
    }

    if (data.user && data.session) {
      console.log("[v0] Login successful, redirecting to dashboard")
      redirect("/dashboard")
    }

    return { error: "Login failed. Please try again." }
  } catch (error) {
    console.error("[v0] Unexpected login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Forgot Password
export async function forgotPassword(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")

  if (!email) {
    return { error: "Email is required" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Starting password reset process for:", email.toString())

    const { error } = await supabase.auth.resetPasswordForEmail(email.toString(), {
      redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"}/auth/reset-password`,
    })

    if (error) {
      console.error("[v0] Password reset error:", error)
      return {
        success: "If an account with this email exists, we've sent you a password reset link. Please check your email.",
      }
    }

    return {
      success: "If an account with this email exists, we've sent you a password reset link. Please check your email.",
    }
  } catch (error) {
    console.error("[v0] Unexpected password reset error:", error)
    return { error: "An error occurred. Please try again." }
  }
}

// Reset Password
export async function resetPassword(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  if (!password || !confirmPassword) {
    return { error: "Password and confirmation are required" }
  }

  if (password.toString() !== confirmPassword.toString()) {
    return { error: "Passwords do not match" }
  }

  const passwordStr = password.toString()
  if (passwordStr.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }
  if (!/(?=.*[a-z])/.test(passwordStr)) {
    return { error: "Password must contain at least one lowercase letter" }
  }
  if (!/(?=.*[A-Z])/.test(passwordStr)) {
    return { error: "Password must contain at least one uppercase letter" }
  }
  if (!/(?=.*\d)/.test(passwordStr)) {
    return { error: "Password must contain at least one number" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Starting password update process")

    const { error } = await supabase.auth.updateUser({
      password: passwordStr,
    })

    if (error) {
      console.error("[v0] Password update error:", error)
      if (error.message.includes("session_not_found") || error.message.includes("invalid_token")) {
        return { error: "This reset link has expired or is invalid. Please request a new password reset." }
      }
      return { error: error.message }
    }

    console.log("[v0] Password updated successfully")
    await supabase.auth.signOut()
    redirect("/auth/login?message=password-reset-success")
  } catch (error) {
    console.error("[v0] Unexpected password update error:", error)
    return { error: "An error occurred. Please try again." }
  }
}

export async function resendConfirmationEmail(email: string) {
  if (!email) {
    return { error: "Email is required" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Resending confirmation email to:", email)

    const redirectUrl =
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      `${typeof window !== "undefined" ? window.location.origin : "https://your-app-domain.vercel.app"}/auth/callback`

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error("[v0] Resend confirmation error:", error)
      return { error: error.message }
    }

    return { success: "Confirmation email sent! Please check your inbox." }
  } catch (error) {
    console.error("[v0] Unexpected resend error:", error)
    return { error: "Failed to resend confirmation email. Please try again." }
  }
}

export async function signUpWithPhone(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const phone = formData.get("phone")
  const password = formData.get("password")
  const userType = formData.get("userType")

  if (!phone || !password || !userType) {
    return { error: "Phone, password, and user type are required" }
  }

  const mappedUserType = userType.toString() === "employer" ? "company" : userType.toString()
  const supabase = await createClient()

  try {
    console.log("[v0] Starting phone signup process for:", phone.toString())

    const { data, error } = await supabase.auth.signUp({
      phone: phone.toString(),
      password: password.toString(),
      options: {
        data: {
          user_type: mappedUserType,
          full_name: "",
          nickname: "",
        },
      },
    })

    if (error) {
      console.error("[v0] Phone signup error:", error)

      if (error.message.includes("Phone number not authorized")) {
        return {
          phoneAuthDisabled: true,
          error: "Phone verification is currently unavailable. Please use email confirmation instead.",
        }
      }

      return { error: error.message }
    }

    if (data.user && !data.user.phone_confirmed_at) {
      return {
        success: "We've sent a verification code to your phone. Please enter it below.",
        phoneNumber: phone.toString(),
        userId: data.user.id,
      }
    }

    return { success: "Phone verification successful!" }
  } catch (error) {
    console.error("[v0] Unexpected phone signup error:", error)
    return {
      phoneAuthDisabled: true,
      error: "Phone verification is currently unavailable. Please use email confirmation instead.",
    }
  }
}

export async function verifyPhoneOtp(phone: string, token: string, userType: string) {
  if (!phone || !token || !userType) {
    return { error: "Phone, verification code, and user type are required" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Verifying phone OTP for:", phone)

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: "sms",
    })

    if (error) {
      console.error("[v0] Phone OTP verification error:", error)
      return { error: error.message }
    }

    if (data.user && data.session) {
      console.log("[v0] Phone verification successful, redirecting to onboarding")
      redirect("/onboarding")
    }

    return { success: "Phone verified successfully!" }
  } catch (error) {
    console.error("[v0] Unexpected phone verification error:", error)
    return { error: "Failed to verify phone number. Please try again." }
  }
}

export async function resendPhoneOtp(phone: string) {
  if (!phone) {
    return { error: "Phone number is required" }
  }

  const supabase = await createClient()

  try {
    console.log("[v0] Resending phone OTP to:", phone)

    const { error } = await supabase.auth.resend({
      type: "sms",
      phone: phone,
    })

    if (error) {
      console.error("[v0] Resend phone OTP error:", error)
      return { error: error.message }
    }

    return { success: "New verification code sent!" }
  } catch (error) {
    console.error("[v0] Unexpected resend phone OTP error:", error)
    return { error: "Failed to resend verification code. Please try again." }
  }
}

// Delete account action
export async function deleteProfessionalAccount(professionalProfileId: string) {
  const supabase = await createClient()

  try {
    console.log("[DELETE_ACCOUNT] Starting professional account deletion")

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[DELETE_ACCOUNT] User not authenticated:", userError)
      return { error: "User not authenticated" }
    }

    console.log("[DELETE_ACCOUNT] User ID:", user.id)
    console.log("[DELETE_ACCOUNT] Professional profile ID:", professionalProfileId)

    // Step 1: Call the database function to delete all related data
    const { data: deletionResult, error: deletionError } = await supabase
      .rpc('delete_professional_account', {
        professional_profile_id: professionalProfileId,
        user_auth_id: user.id
      })

    if (deletionError) {
      console.error("[DELETE_ACCOUNT] Database deletion error:", deletionError)
      console.error("[DELETE_ACCOUNT] Error details:", {
        message: deletionError.message,
        code: deletionError.code,
        details: deletionError.details,
        hint: deletionError.hint
      })
      return { error: `Database error: ${deletionError.message || 'Failed to execute account deletion'}. Please contact support if this persists.` }
    }

    console.log("[DELETE_ACCOUNT] Database deletion result:", deletionResult)

    // Step 2: Delete all files from storage
    try {
      const { data: profileFiles } = await supabase.storage
        .from('profile-photos')
        .list(user.id)

      if (profileFiles && profileFiles.length > 0) {
        const profileFileNames = profileFiles.map(file => `${user.id}/${file.name}`)
        await supabase.storage
          .from('profile-photos')
          .remove(profileFileNames)
        console.log("[DELETE_ACCOUNT] Deleted profile photos:", profileFileNames)
      }
    } catch (storageError) {
      console.warn("[DELETE_ACCOUNT] Storage cleanup error (non-critical):", storageError)
    }

    // Step 3: Use admin client to delete the auth user
    try {
      const adminClient = createAdminClient()
      const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)

      if (authError) {
        console.error("[DELETE_ACCOUNT] Admin delete user error:", authError)
        return { error: `Failed to delete user account: ${authError.message}` }
      }

      console.log("[DELETE_ACCOUNT] Auth user deleted successfully")
    } catch (adminError) {
      console.error("[DELETE_ACCOUNT] Admin client error:", adminError)
      return { error: "Failed to complete account deletion. Please contact support." }
    }

    // Step 4: Sign out and redirect
    await supabase.auth.signOut()
    console.log("[DELETE_ACCOUNT] Account deletion completed successfully")

    return { success: true }
  } catch (error) {
    console.error("[DELETE_ACCOUNT] Unexpected error:", error)
    return { error: "An unexpected error occurred while deleting your account. Please try again." }
  }
}

// Delete company account action
export async function deleteCompanyAccount(companyProfileId: string) {
  const supabase = await createClient()

  try {
    console.log("[DELETE_ACCOUNT] Starting company account deletion")

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[DELETE_ACCOUNT] User not authenticated:", userError)
      return { error: "User not authenticated" }
    }

    console.log("[DELETE_ACCOUNT] User ID:", user.id)
    console.log("[DELETE_ACCOUNT] Company profile ID:", companyProfileId)

    // Step 1: Call the database function to delete all related data
    const { data: deletionResult, error: deletionError } = await supabase
      .rpc('delete_company_account', {
        company_profile_id: companyProfileId,
        user_auth_id: user.id
      })

    if (deletionError) {
      console.error("[DELETE_ACCOUNT] Database deletion error:", deletionError)
      console.error("[DELETE_ACCOUNT] Error details:", {
        message: deletionError.message,
        code: deletionError.code,
        details: deletionError.details,
        hint: deletionError.hint
      })
      return { error: `Database error: ${deletionError.message || 'Failed to execute account deletion'}. Please contact support if this persists.` }
    }

    console.log("[DELETE_ACCOUNT] Database deletion result:", deletionResult)

    // Step 2: Delete all files from storage
    try {
      const { data: profileFiles } = await supabase.storage
        .from('company-logos')
        .list(user.id)

      if (profileFiles && profileFiles.length > 0) {
        const profileFileNames = profileFiles.map(file => `${user.id}/${file.name}`)
        await supabase.storage
          .from('company-logos')
          .remove(profileFileNames)
        console.log("[DELETE_ACCOUNT] Deleted company logos:", profileFileNames)
      }
    } catch (storageError) {
      console.warn("[DELETE_ACCOUNT] Storage cleanup error (non-critical):", storageError)
    }

    // Step 3: Use admin client to delete the auth user
    try {
      const adminClient = createAdminClient()
      const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)

      if (authError) {
        console.error("[DELETE_ACCOUNT] Admin delete user error:", authError)
        return { error: `Failed to delete user account: ${authError.message}` }
      }

      console.log("[DELETE_ACCOUNT] Auth user deleted successfully")
    } catch (adminError) {
      console.error("[DELETE_ACCOUNT] Admin client error:", adminError)
      return { error: "Failed to complete account deletion. Please contact support." }
    }

    // Step 4: Sign out and redirect
    await supabase.auth.signOut()
    console.log("[DELETE_ACCOUNT] Account deletion completed successfully")

    return { success: true }
  } catch (error) {
    console.error("[DELETE_ACCOUNT] Unexpected error:", error)
    return { error: "An unexpected error occurred while deleting your account. Please try again." }
  }
}
