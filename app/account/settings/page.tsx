import {
  User, Lock, CreditCard, ArrowLeft,
  ChevronRight, Shield, Trash2,
} from "lucide-react"
import { EmailAlertsToggles, VisibilityToggles } from "@/components/account-settings-toggles"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ── Reusable row component ────────────────────────────────────────────────────
function SettingsRow({
  icon: Icon,
  iconColor = "text-slate-400",
  iconBg = "bg-slate-800",
  label,
  description,
  href,
  last = false,
}: {
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  label: string
  description?: string
  href: string
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-800/60 active:bg-slate-800 transition-colors group ${
        !last ? "border-b border-slate-700/50" : ""
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
    </Link>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")

  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  const userType = userData?.user_type as string | null

  const dashboardHref =
    userType === "professional" ? "/dashboard/professional" :
    userType === "company"      ? "/dashboard/company" :
    userType === "homeowner"    ? "/dashboard/homeowner" :
    userType === "contractor"   ? "/dashboard/contractor" :
    "/dashboard"

  const editProfileHref =
    userType === "company"     ? "/company/profile/edit" :
    userType === "contractor"  ? "/contractor/profile/edit" :
    userType === "homeowner"   ? "/dashboard/homeowner/profile" :
    "/profile/edit"

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-6">

        {/* Back */}
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your profile, security, and preferences</p>
        </div>

        {/* ── Account ── */}
        <Section title="Account">
          <SettingsRow
            icon={User}
            iconBg="bg-blue-500/15"
            iconColor="text-blue-400"
            label="Edit Profile"
            description="Update your name, photo, and details"
            href={editProfileHref}
          />
          <SettingsRow
            icon={Lock}
            iconBg="bg-amber-500/15"
            iconColor="text-amber-400"
            label="Password & Security"
            description="Change your password or secure your account"
            href="/account/security"
          />
          <SettingsRow
            icon={Shield}
            iconBg="bg-purple-500/15"
            iconColor="text-purple-400"
            label="Privacy Centre"
            description="Control your data and privacy settings"
            href="/privacy-centre"
            last
          />
        </Section>

        {/* ── Email Alerts ── */}
        <Section title="Email Alerts">
          <EmailAlertsToggles userId={user.id} />
        </Section>

        {/* ── Visibility ── */}
        <Section title="Profile Visibility">
          <VisibilityToggles userId={user.id} />
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger Zone">
          <Link
            href="/account/delete"
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
        </Section>

      </div>
    </div>
  )
}
