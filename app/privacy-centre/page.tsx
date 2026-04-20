import { Shield, Eye, Trash2, FileText, ArrowLeft, ChevronRight } from "lucide-react"
import NotificationPreferences from "@/components/notification-preferences"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function PrivacyCentrePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/15 flex-shrink-0">
            <Shield className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Privacy Centre</h1>
            <p className="text-sm text-slate-500">Manage your privacy settings and control how your data is used</p>
          </div>
        </div>

        {/* Data & Privacy actions */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">Data & Privacy</p>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <Link
              href="/account/settings"
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-800/60 active:bg-slate-800 transition-colors group border-b border-slate-700/50"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-500/15">
                <Eye className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100">Profile Visibility</p>
                <p className="text-xs text-slate-500 mt-0.5">Control who can see your profile and information</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
            </Link>
            <Link
              href="/account/security"
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-red-500/5 active:bg-red-500/10 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/15">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-400">Delete Account</p>
                <p className="text-xs text-slate-500 mt-0.5">Permanently remove your account and all data</p>
              </div>
              <ChevronRight className="h-4 w-4 text-red-700 group-hover:text-red-500 flex-shrink-0 transition-colors" />
            </Link>
          </div>
        </div>

        {/* GDPR Rights */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-200">Your Rights</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            You have the right to access, correct, or delete your personal data. You can also object to processing or
            request data portability. Contact us at{" "}
            <a
              href="mailto:privacy@openjobmarket.com"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              privacy@openjobmarket.com
            </a>{" "}
            for assistance.
          </p>
        </div>

        {/* Notifications & Preferences */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">
            Notifications & Preferences
          </p>
          <NotificationPreferences userId={user.id} />
        </div>

      </div>
    </div>
  )
}
