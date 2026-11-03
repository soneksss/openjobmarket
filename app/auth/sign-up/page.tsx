import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import MultiStepSignup from "@/components/multi-step-signup"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthSplitLayout } from "@/components/brand-panel"

export default async function SignUpPage() {
  // Check if user is already logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  // Note: Locale is now handled by middleware via query parameter

  return (
    <ErrorBoundary>
      <AuthSplitLayout headline={<>Join Open Job Market, <span className="ojm-glow-text">free.</span></>}>
        <MultiStepSignup />
      </AuthSplitLayout>
    </ErrorBoundary>
  )
}
