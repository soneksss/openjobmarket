import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function HomeownerOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  redirect("/dashboard/homeowner")
}
