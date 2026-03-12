import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

/**
 * /onboarding is no longer used — all profile data is collected during sign-up.
 * Redirect every user to their appropriate dashboard.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle()

  const dashboardMap: Record<string, string> = {
    homeowner:    "/dashboard/homeowner",
    company:      "/dashboard/company",
    employer:     "/dashboard/company",
    professional: "/dashboard/professional",
    jobseeker:    "/dashboard/professional",
    contractor:   "/dashboard/contractor",
    admin:        "/admin/dashboard",
  }

  const dest = userData?.user_type ? (dashboardMap[userData.user_type] ?? "/") : "/"
  redirect(dest)
}
