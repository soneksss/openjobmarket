import { Shield, FileText, ArrowLeft } from "lucide-react"
import { VisibilityToggles } from "@/components/account-settings-toggles"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = 'force-dynamic'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">
        {title}
      </p>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default async function PrivacyCentrePage() {
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/15 flex-shrink-0">
            <Shield className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Privacy Centre</h1>
            <p className="text-sm text-slate-500">Control who can see your profile and how your data is used</p>
          </div>
        </div>

        {/* Profile Visibility */}
        <Section title="Profile Visibility">
          <VisibilityToggles userId={user.id} />
        </Section>

        {/* Your Rights */}
        <Section title="Your Rights (GDPR)">
          <div className="px-4 py-4 flex items-start gap-3">
            <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-400 leading-relaxed">
              You have the right to access, correct, or delete your personal data. You can also
              object to processing or request data portability. Contact us at{" "}
              <a
                href="mailto:privacy@openjobmarket.com"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                privacy@openjobmarket.com
              </a>{" "}
              for assistance.
            </p>
          </div>
        </Section>

      </div>
    </div>
  )
}
