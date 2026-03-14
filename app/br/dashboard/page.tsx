import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function DashboardPageBR() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/dashboard")
  }

  // Check user type and redirect to appropriate dashboard
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (userData?.user_type === "company") {
    redirect("/br/dashboard/company")
  } else if (userData?.user_type === "homeowner") {
    redirect("/br/dashboard/homeowner")
  } else {
    redirect("/br/dashboard/homeowner")
  }
}
