// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"


export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is an admin first
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (adminUser) {
    redirect("/admin/dashboard")
  }

  // Check user type and redirect to appropriate dashboard
  const { data: userData, error: userError } = await supabase.from("users").select("user_type").eq("id", user.id).single()

  if (!userData || userError) {
    // User is authenticated but hasn't completed profile - redirect to home where they can browse
    console.log("[DASHBOARD] User data not found for authenticated user, redirecting to home")
    redirect("/?complete_profile=true")
  }

  if (userData.user_type === "professional") {
    redirect("/dashboard/professional")
  } else if (userData.user_type === "company") {
    redirect("/dashboard/company")
  } else if (userData.user_type === "homeowner") {
    redirect("/dashboard/homeowner")
  } else if (userData.user_type === "contractor") {
    redirect("/dashboard/contractor")
  } else {
    // User is authenticated but hasn't set user type - redirect to home where they can browse
    console.log("[DASHBOARD] User type not set, redirecting to home")
    redirect("/?complete_profile=true")
  }
}
