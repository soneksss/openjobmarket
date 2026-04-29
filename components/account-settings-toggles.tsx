"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Mail, MessageSquare, Megaphone, Eye, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/client"

// ── Dark Spareroom-style toggle row ───────────────────────────────────────────
function ToggleRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  checked,
  onChange,
  disabled,
  last = false,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  description?: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 ${
        !last ? "border-b border-slate-700/50" : ""
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="flex-shrink-0"
      />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ToggleSkeleton({ count = 3, last = false }: { count?: number; last?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3.5 px-4 py-3.5 ${
            i < count - 1 || !last ? "border-b border-slate-700/50" : ""
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-slate-700/50 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 bg-slate-700/50 animate-pulse rounded" />
            <div className="h-2.5 w-48 bg-slate-700/30 animate-pulse rounded" />
          </div>
          <div className="w-10 h-5 bg-slate-700/50 animate-pulse rounded-full flex-shrink-0" />
        </div>
      ))}
    </>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmailPrefs {
  email_on_new_message: boolean
  email_on_job_application: boolean
  marketing_emails: boolean
}

interface VisibilityPrefs {
  profile_visible: boolean
  allow_messages: boolean
}

// ── Email Alerts section ──────────────────────────────────────────────────────
export function EmailAlertsToggles({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("user_notification_preferences")
          .select(
            "email_on_new_message, email_on_job_application, marketing_emails"
          )
          .eq("user_id", userId)
          .maybeSingle()

        setPrefs(
          data ?? {
            email_on_new_message: true,
            email_on_job_application: true,
            marketing_emails: false,
          }
        )
      } catch {
        // silently use defaults
        setPrefs({
          email_on_new_message: true,
          email_on_job_application: true,
          marketing_emails: false,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const toggle = async (key: keyof EmailPrefs, value: boolean) => {
    if (!prefs) return
    setSaving(key)
    const optimistic = { ...prefs, [key]: value }
    setPrefs(optimistic)
    try {
      await supabase
        .from("user_notification_preferences")
        .upsert({ user_id: userId, ...optimistic }, { onConflict: "user_id" })
    } catch {
      setPrefs(prefs) // revert on error
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <ToggleSkeleton count={3} />

  return (
    <>
      <ToggleRow
        icon={MessageSquare}
        iconBg="bg-blue-500/15"
        iconColor="text-blue-400"
        label="New Messages"
        description="Email when someone messages you"
        checked={prefs!.email_on_new_message}
        onChange={(v) => toggle("email_on_new_message", v)}
        disabled={saving === "email_on_new_message"}
      />
      <ToggleRow
        icon={Mail}
        iconBg="bg-emerald-500/15"
        iconColor="text-emerald-400"
        label="Job Applications"
        description="Email when someone applies to your job"
        checked={prefs!.email_on_job_application}
        onChange={(v) => toggle("email_on_job_application", v)}
        disabled={saving === "email_on_job_application"}
      />
      <ToggleRow
        icon={Megaphone}
        iconBg="bg-purple-500/15"
        iconColor="text-purple-400"
        label="Marketing Emails"
        description="Tips, updates, and offers from Open Job Market"
        checked={prefs!.marketing_emails}
        onChange={(v) => toggle("marketing_emails", v)}
        disabled={saving === "marketing_emails"}
        last
      />
    </>
  )
}

// ── Profile Visibility section ────────────────────────────────────────────────
export function VisibilityToggles({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<VisibilityPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("profile_visible, allow_messages")
          .eq("id", userId)
          .maybeSingle()

        setPrefs(
          data ?? { profile_visible: true, allow_messages: true }
        )
      } catch {
        setPrefs({ profile_visible: true, allow_messages: true })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const toggle = async (key: keyof VisibilityPrefs, value: boolean) => {
    if (!prefs) return
    setSaving(key)
    const optimistic = { ...prefs, [key]: value }
    setPrefs(optimistic)
    try {
      await supabase.from("users").update({ [key]: value }).eq("id", userId)
    } catch {
      setPrefs(prefs)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <ToggleSkeleton count={2} />

  return (
    <>
      <ToggleRow
        icon={Eye}
        iconBg="bg-sky-500/15"
        iconColor="text-sky-400"
        label="Public Profile"
        description="Allow others to view your profile page"
        checked={prefs!.profile_visible}
        onChange={(v) => toggle("profile_visible", v)}
        disabled={saving === "profile_visible"}
      />
      <ToggleRow
        icon={MessageCircle}
        iconBg="bg-teal-500/15"
        iconColor="text-teal-400"
        label="Allow Direct Messages"
        description="Let other users message you directly"
        checked={prefs!.allow_messages}
        onChange={(v) => toggle("allow_messages", v)}
        disabled={saving === "allow_messages"}
        last
      />
    </>
  )
}
