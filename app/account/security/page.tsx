import { Lock, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import SecuritySettings from "@/components/security-settings"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-6">

        <Link
          href="/account/settings"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account Settings
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15 flex-shrink-0">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Password & Security</h1>
            <p className="text-sm text-slate-500">Manage your password and account security</p>
          </div>
        </div>

        <SecuritySettings userEmail={user.email || ""} />

      </div>
    </div>
  )
}
