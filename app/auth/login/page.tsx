import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthSplitLayout } from "@/components/brand-panel"

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
      <AuthSplitLayout headline={<>Welcome <span className="ojm-glow-text">back.</span></>}>
        <LoginForm />
      </AuthSplitLayout>
    </ErrorBoundary>
  )
}
