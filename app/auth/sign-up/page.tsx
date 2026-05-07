import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import MultiStepSignup from "@/components/multi-step-signup"
import { ErrorBoundary } from "@/components/error-boundary"

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
      <div className="relative min-h-screen bg-slate-950 overflow-hidden">
        {/* Subtle emerald radial glow — premium depth without color noise */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.07),transparent)]" />
        {/* Very faint grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 flex min-h-screen items-start sm:items-center justify-center px-4 py-4 sm:py-12">
          <MultiStepSignup />
        </div>
      </div>
    </ErrorBoundary>
  )
}
