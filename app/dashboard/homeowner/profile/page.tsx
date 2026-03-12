import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { HomeownerProfileEditForm } from "@/components/homeowner-profile-edit-form"

export const dynamic = 'force-dynamic'

export default async function HomeownerProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError) {
    console.warn("[HOMEOWNER-PROFILE] Error fetching profile:", profileError)
  }

  if (!profile) {
    redirect("/dashboard/homeowner")
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard/homeowner"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-white">Edit Profile</h1>
        </div>
      </div>

      {/* Form */}
      <HomeownerProfileEditForm profile={profile} userId={user.id} />
    </div>
  )
}
