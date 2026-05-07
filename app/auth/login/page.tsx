import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"
import { ErrorBoundary } from "@/components/error-boundary"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createClient()

  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // AbortError (3s timeout) — render login form without redirect
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  // Note: Locale is now handled by middleware via query parameter

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
        <LoginForm />
      </div>
    </ErrorBoundary>
  )
}
