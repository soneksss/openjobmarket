"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Step1 } from "./Step1"
import { Step2 } from "./Step2"
import { Step3 } from "./Step3"
import { SignupStep } from "./SignupStep"
import { ProgressIndicator } from "./ProgressIndicator"

type Action = "provider" | "hiring" | null
type UserType = "individual" | "business" | null
type Role = "homeowner" | "jobseeker" | "employer" | "contractor" | null

interface OnboardingFlowProps {
  onClose?: () => void
  initialAction?: "provider" | "hiring"
}

export function OnboardingFlow({ onClose, initialAction }: OnboardingFlowProps) {
  const router = useRouter()

  // Check for preselected role and usertype from category cards
  const preselectedRole = typeof window !== 'undefined' ? localStorage.getItem("onboarding_preselected_role") : null
  const preselectedUserType = typeof window !== 'undefined' ? localStorage.getItem("onboarding_preselected_usertype") : null

  // If we have preselected values, skip directly to signup (step 4)
  const shouldSkipToSignup = preselectedRole && preselectedUserType

  // Start at step 2 if initialAction is provided (skip Step 1), or step 4 if we have preselected values
  const [currentStep, setCurrentStep] = useState(
    shouldSkipToSignup ? 4 : (initialAction ? 2 : 1)
  )
  const [action, setAction] = useState<Action>(initialAction || null)
  const [userType, setUserType] = useState<UserType>(
    (preselectedUserType as UserType) || null
  )
  const [role, setRole] = useState<Role>(
    (preselectedRole as Role) || null
  )

  // Load saved state from localStorage on mount
  useEffect(() => {
    // Only load saved state if no initial action is provided and no preselected values
    if (!initialAction && !shouldSkipToSignup) {
      const savedState = localStorage.getItem("onboarding_state")
      if (savedState) {
        try {
          const { step, action: savedAction, userType: savedUserType, role: savedRole } = JSON.parse(savedState)
          if (step) setCurrentStep(step)
          if (savedAction) setAction(savedAction)
          if (savedUserType) setUserType(savedUserType)
          if (savedRole) setRole(savedRole)
        } catch (err) {
          console.error("Failed to load saved onboarding state:", err)
        }
      }
    }

    // Clear preselected values after using them
    if (shouldSkipToSignup) {
      localStorage.removeItem("onboarding_preselected_role")
      localStorage.removeItem("onboarding_preselected_usertype")
    }
  }, [initialAction, shouldSkipToSignup])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("onboarding_state", JSON.stringify({
      step: currentStep,
      action,
      userType,
      role
    }))
  }, [currentStep, action, userType, role])

  const handleStep1Select = (selectedAction: "provider" | "hiring") => {
    setAction(selectedAction)
    setCurrentStep(2)
  }

  const handleStep2Select = (selectedUserType: "individual" | "business") => {
    setUserType(selectedUserType)
    setCurrentStep(3)
  }

  const handleStep3Select = (selectedRole: "homeowner" | "jobseeker" | "employer" | "contractor") => {
    setRole(selectedRole)
    setCurrentStep(4)
  }

  const handleSignup = async (email: string, password: string) => {
    if (!role) return

    const supabase = createClient()

    // Map role to user_type for database
    const userTypeMap: Record<string, string> = {
      homeowner: "homeowner",
      jobseeker: "jobseeker",
      employer: "employer",
      contractor: "contractor"
    }

    const dbUserType = userTypeMap[role]

    try {
      // Try to sign up the user
      console.log('[SIGNUP] Attempting signup with:', { email, role, dbUserType })

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: {
            user_type: dbUserType,
            role: role,
            onboarding_completed: false
          }
        }
      })

      console.log('[SIGNUP] Signup response:', { authData, authError })

      // Handle case where user already exists
      if (authError && (authError.message?.includes("User already registered") || authError.message?.includes("already been registered"))) {
        console.log("User already exists, attempting to sign in...")

        // Try to sign in the existing user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw new Error("An account with this email already exists. Please use the correct password or reset your password.")
        }

        if (signInData.user) {
          // Check if user has completed their profile
          const { data: userData } = await supabase
            .from("users")
            .select("user_type")
            .eq("id", signInData.user.id)
            .single()

          let hasCompleteProfile = false

          // Check for homeowner profile
          if (userData?.user_type === "homeowner" || dbUserType === "homeowner") {
            const { data: homeownerProfile } = await supabase
              .from("homeowner_profiles")
              .select("id, first_name, last_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!(homeownerProfile?.first_name && homeownerProfile?.last_name)

            if (hasCompleteProfile) {
              router.push("/dashboard/homeowner")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding/homeowner")
              if (onClose) onClose()
              return
            }
          }

          // Check for jobseeker profile (redirects to professional)
          if (userData?.user_type === "jobseeker" || dbUserType === "jobseeker") {
            const { data: professionalProfile } = await supabase
              .from("professional_profiles")
              .select("id, first_name, last_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!(professionalProfile?.first_name && professionalProfile?.last_name)

            if (hasCompleteProfile) {
              router.push("/dashboard/professional")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding")
              if (onClose) onClose()
              return
            }
          }

          // Check for employer profile (redirects to company)
          if (userData?.user_type === "employer" || dbUserType === "employer") {
            const { data: companyProfile } = await supabase
              .from("company_profiles")
              .select("id, company_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!companyProfile?.company_name

            if (hasCompleteProfile) {
              router.push("/dashboard/company")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding")
              if (onClose) onClose()
              return
            }
          }

          // Check for contractor profile
          if (userData?.user_type === "contractor" || dbUserType === "contractor") {
            const { data: contractorProfile } = await supabase
              .from("contractor_profiles")
              .select("id, company_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!contractorProfile?.company_name

            if (hasCompleteProfile) {
              router.push("/dashboard/contractor")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding/contractor")
              if (onClose) onClose()
              return
            }
          }

          // Check for legacy professional profile
          if (userData?.user_type === "professional") {
            const { data: professionalProfile } = await supabase
              .from("professional_profiles")
              .select("id, first_name, last_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!(professionalProfile?.first_name && professionalProfile?.last_name)

            if (hasCompleteProfile) {
              router.push("/dashboard/professional")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding")
              if (onClose) onClose()
              return
            }
          }

          // Check for legacy company profile
          if (userData?.user_type === "company") {
            const { data: companyProfile } = await supabase
              .from("company_profiles")
              .select("id, company_name")
              .eq("user_id", signInData.user.id)
              .single()

            hasCompleteProfile = !!companyProfile?.company_name

            if (hasCompleteProfile) {
              router.push("/dashboard/company")
              router.refresh()
              if (onClose) onClose()
              return
            } else {
              router.push("/onboarding")
              if (onClose) onClose()
              return
            }
          }

          // If no profile found, continue to onboarding
          router.push("/onboarding")
          if (onClose) onClose()
          return
        }
      } else if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Clear onboarding state
      localStorage.removeItem("onboarding_state")

      // New user - redirect to appropriate onboarding
      if (dbUserType === "homeowner") {
        router.push("/onboarding/homeowner")
      } else if (dbUserType === "contractor") {
        router.push("/onboarding/contractor")
      } else {
        router.push("/onboarding")
      }

      router.refresh()

      // Close modal if callback provided
      if (onClose) {
        onClose()
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      throw new Error(err.message || "Failed to create account. Please try again.")
    }
  }

  const handleBack = () => {
    // Don't go back past step 2 if we started with initialAction
    const minStep = initialAction ? 2 : 1
    if (currentStep > minStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Adjust labels and step count based on whether we're skipping step 1
  const stepLabels = initialAction ? ["Type", "Role", "Sign Up"] : ["Action", "Type", "Role", "Sign Up"]
  const totalSteps = initialAction ? 3 : 4
  const adjustedStep = initialAction ? currentStep - 1 : currentStep

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
      <ProgressIndicator
        currentStep={adjustedStep}
        totalSteps={totalSteps}
        labels={stepLabels}
      />

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <Step1 key="step1" onSelect={handleStep1Select} />
        )}

        {currentStep === 2 && (
          <Step2 key="step2" onSelect={handleStep2Select} onBack={handleBack} />
        )}

        {currentStep === 3 && userType && (
          <Step3
            key="step3"
            userType={userType}
            onSelect={handleStep3Select}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && role && (
          <SignupStep
            key="step4"
            role={role}
            onSignup={handleSignup}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
