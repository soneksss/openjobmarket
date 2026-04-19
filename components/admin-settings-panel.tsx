"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Settings, Crown, Smartphone, Flag, LayoutDashboard,
  Save, CheckCircle, AlertCircle, Loader2, CreditCard,
  ExternalLink,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface DBSettings {
  subscriptions_enabled: boolean
  signin_required_to_search: boolean
  vacancies_jobseekers_enabled: boolean
  professional_actively_looking_enabled: boolean
  enquiry_fee: number
  actively_looking_price: number
  actively_looking_free: boolean
  layout_version: "v1" | "v2"
  ui_urgent_jobs_banner: boolean
  ui_promotions_banner: boolean
  min_app_version: string
  force_update: boolean
}

interface DBFlags {
  ai_job_matching: boolean
  video_quotes: boolean
  instant_booking: boolean
}

// ── Building blocks ──────────────────────────────────────────────────────────

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function NumRow({ label, hint, value, onChange, prefix }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; prefix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {prefix && <span className="text-zinc-400 text-sm">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm text-right"
        />
      </div>
    </div>
  )
}

function StrRow({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-32 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm shrink-0"
      />
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
    </div>
  )
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}`} />
      <span className={`text-sm ${ok ? "text-zinc-100" : "text-zinc-500"}`}>{label}</span>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
      <p className="text-sm text-zinc-400">{label}</p>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Section({ title, dirty, saving, saved, error, onSave, children }: {
  title: string; dirty: boolean; saving: boolean; saved: boolean; error: string | null
  onSave: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900">
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
          {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={onSave}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span className="ml-1">{saving ? "Saving…" : "Save"}</span>
          </Button>
        </div>
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

function StaticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900">
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function useSaveState() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setSaving(true); setError(null)
    try { await fn(); setSaved(true) }
    catch (e: any) { setError(e.message ?? "Save failed") }
    finally { setSaving(false) }
  }
  return { saving, saved, error, run }
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "general",       label: "General",        icon: Settings },
  { id: "subscriptions", label: "Subscriptions",  icon: Crown },
  { id: "payments",      label: "Payments",       icon: CreditCard },
  { id: "ui",            label: "UI / Banners",   icon: LayoutDashboard },
  { id: "mobile",        label: "Mobile App",     icon: Smartphone },
  { id: "features",      label: "Feature Flags",  icon: Flag },
] as const

type SectionId = typeof NAV[number]["id"]

// ── Main ─────────────────────────────────────────────────────────────────────

export function AdminSettingsPanel() {
  const [active, setActive] = useState<SectionId>("general")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [savedS, setSavedS] = useState<DBSettings | null>(null)
  const [savedF, setSavedF] = useState<DBFlags | null>(null)
  const [s, setS] = useState<DBSettings | null>(null)
  const [f, setF] = useState<DBFlags | null>(null)

  const general       = useSaveState()
  const subscriptions = useSaveState()
  const ui            = useSaveState()
  const mobile        = useSaveState()
  const features      = useSaveState()

  useEffect(() => {
    fetch("/api/admin/app-config")
      .then(r => r.json())
      .then(data => {
        const settings: DBSettings = {
          subscriptions_enabled:                 data.settings.subscriptions_enabled ?? false,
          signin_required_to_search:             data.settings.signin_required_to_search ?? false,
          vacancies_jobseekers_enabled:          data.settings.vacancies_jobseekers_enabled ?? true,
          professional_actively_looking_enabled: data.settings.professional_actively_looking_enabled ?? true,
          enquiry_fee:                           parseFloat(data.settings.enquiry_fee) || 5,
          actively_looking_price:                parseFloat(data.settings.actively_looking_price) || 0,
          actively_looking_free:                 data.settings.actively_looking_free ?? true,
          layout_version:                        data.settings.layout_version ?? "v1",
          ui_urgent_jobs_banner:                 data.settings.ui_urgent_jobs_banner ?? true,
          ui_promotions_banner:                  data.settings.ui_promotions_banner ?? false,
          min_app_version:                       data.settings.min_app_version ?? "1.0.0",
          force_update:                          data.settings.force_update ?? false,
        }
        const flags: DBFlags = {
          ai_job_matching: data.featureFlags.ai_job_matching ?? false,
          video_quotes:    data.featureFlags.video_quotes    ?? false,
          instant_booking: data.featureFlags.instant_booking ?? false,
        }
        setSavedS(settings); setS(settings)
        setSavedF(flags);    setF(flags)
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async (keys: (keyof DBSettings)[]) => {
    if (!s) return
    const patch: Record<string, unknown> = {}
    for (const k of keys) patch[k] = s[k]
    const res = await fetch("/api/admin/app-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: patch }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? "Save failed")
    setSavedS(prev => prev ? { ...prev, ...patch } as DBSettings : null)
  }

  const saveFlags = async (keys: (keyof DBFlags)[]) => {
    if (!f) return
    const patch: Record<string, unknown> = {}
    for (const k of keys) patch[k] = f[k]
    const res = await fetch("/api/admin/app-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureFlags: patch }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? "Save failed")
    setSavedF(prev => prev ? { ...prev, ...patch } as DBFlags : null)
  }

  const dirtyFor = (keys: (keyof DBSettings)[]) =>
    !!s && !!savedS && keys.some(k => s[k] !== savedS[k])

  const dirtyFlags = (keys: (keyof DBFlags)[]) =>
    !!f && !!savedF && keys.some(k => f[k] !== savedF[k])

  const set = <K extends keyof DBSettings>(k: K, v: DBSettings[K]) =>
    setS(prev => prev ? { ...prev, [k]: v } : prev)

  const setFlag = <K extends keyof DBFlags>(k: K, v: boolean) =>
    setF(prev => prev ? { ...prev, [k]: v } : prev)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
      </div>
    )
  }

  if (loadError || !s || !f) {
    return (
      <div className="flex items-center gap-2 text-red-400 p-4 rounded-lg border border-red-800 bg-red-950/30">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm">{loadError ?? "Failed to load settings"}</span>
      </div>
    )
  }

  const GENERAL_KEYS: (keyof DBSettings)[] = [
    "subscriptions_enabled", "signin_required_to_search",
    "vacancies_jobseekers_enabled", "professional_actively_looking_enabled",
  ]
  const SUB_KEYS: (keyof DBSettings)[] = [
    "enquiry_fee", "actively_looking_price", "actively_looking_free",
  ]
  const UI_KEYS: (keyof DBSettings)[]     = ["ui_urgent_jobs_banner", "ui_promotions_banner"]
  const MOBILE_KEYS: (keyof DBSettings)[] = ["layout_version", "min_app_version", "force_update"]
  const FLAG_KEYS: (keyof DBFlags)[]      = ["ai_job_matching", "video_quotes", "instant_booking"]

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Sidebar */}
      <nav className="w-44 shrink-0 space-y-0.5 pt-1">
        {NAV.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-4">

        {active === "general" && (
          <Section
            title="General"
            dirty={dirtyFor(GENERAL_KEYS)}
            saving={general.saving}
            saved={general.saved}
            error={general.error}
            onSave={() => general.run(() => saveSettings(GENERAL_KEYS))}
          >
            <Row label="Subscriptions enabled" hint="Gate features behind paid plans — currently free">
              <Switch checked={s.subscriptions_enabled} onCheckedChange={v => set("subscriptions_enabled", v)} />
            </Row>
            <Row label="Sign-in required to search" hint="Prevent anonymous browsing">
              <Switch checked={s.signin_required_to_search} onCheckedChange={v => set("signin_required_to_search", v)} />
            </Row>
            <Row label="Vacancies & Jobseekers tabs" hint="Show 4-tab mode on homepage">
              <Switch checked={s.vacancies_jobseekers_enabled} onCheckedChange={v => set("vacancies_jobseekers_enabled", v)} />
            </Row>
            <Row label="Professional actively-looking" hint="Allow tradespeople to mark themselves available">
              <Switch checked={s.professional_actively_looking_enabled} onCheckedChange={v => set("professional_actively_looking_enabled", v)} />
            </Row>
          </Section>
        )}

        {active === "subscriptions" && (
          <Section
            title="Subscriptions"
            dirty={dirtyFor(SUB_KEYS)}
            saving={subscriptions.saving}
            saved={subscriptions.saved}
            error={subscriptions.error}
            onSave={() => subscriptions.run(() => saveSettings(SUB_KEYS))}
          >
            <div className="py-3 mb-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-950/40 border border-blue-800/50">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <p className="text-xs text-blue-300">
                  Platform is currently <strong>free</strong>. Prices below take effect when subscriptions are enabled.
                </p>
              </div>
            </div>
            <Row label="Actively-looking free" hint="No charge for tradespeople to appear in search">
              <Switch checked={s.actively_looking_free} onCheckedChange={v => set("actively_looking_free", v)} />
            </Row>
            <NumRow
              label="Actively-looking price" hint="Monthly fee when not free"
              value={s.actively_looking_price} onChange={v => set("actively_looking_price", v)}
              prefix="£"
            />
            <NumRow
              label="Enquiry fee" hint="Fee charged per enquiry sent"
              value={s.enquiry_fee} onChange={v => set("enquiry_fee", v)}
              prefix="£"
            />
          </Section>
        )}

        {active === "payments" && (
          <StaticSection title="Payments">
            <Divider label="Provider" />
            <InfoRow label="Payment provider">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">Stripe</span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Recommended</span>
              </span>
            </InfoRow>

            <div className="py-3 border-b border-zinc-800">
              <Button
                variant="outline"
                className="h-8 px-4 text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-transparent"
                onClick={() => window.open("https://dashboard.stripe.com/settings/account", "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Connect Stripe Account
              </Button>
            </div>

            <Divider label="Status" />
            <InfoRow label="Account">
              <StatusDot ok={false} label="Not connected" />
            </InfoRow>

            <Divider label="Mode" />
            <InfoRow label="Environment">
              <div className="flex rounded-lg overflow-hidden border border-zinc-700 opacity-50 pointer-events-none">
                {["Test Mode", "Live Mode"].map((m, i) => (
                  <span key={m} className={`px-3 py-1 text-xs ${i === 0 ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"}`}>
                    {m}
                  </span>
                ))}
              </div>
            </InfoRow>

            <Divider label="Webhooks" />
            <InfoRow label="Webhook status">
              <StatusDot ok={false} label="Not receiving events" />
            </InfoRow>

            <Divider label="Transactions" />
            <InfoRow label="Last payment">
              <span className="text-sm text-zinc-500">£0 — no transactions yet</span>
            </InfoRow>

            <div className="py-4">
              <p className="text-xs text-zinc-600">
                Connect a Stripe account above to enable subscription billing for tradespeople.
                Webhooks will be configured automatically once connected.
              </p>
            </div>
          </StaticSection>
        )}

        {active === "ui" && (
          <Section
            title="UI / Banners"
            dirty={dirtyFor(UI_KEYS)}
            saving={ui.saving}
            saved={ui.saved}
            error={ui.error}
            onSave={() => ui.run(() => saveSettings(UI_KEYS))}
          >
            <Row label="Urgent jobs banner" hint="Show urgent-jobs callout strip on homepage">
              <Switch checked={s.ui_urgent_jobs_banner} onCheckedChange={v => set("ui_urgent_jobs_banner", v)} />
            </Row>
            <Row label="Promotions banner" hint="Show promotions/offers strip on homepage">
              <Switch checked={s.ui_promotions_banner} onCheckedChange={v => set("ui_promotions_banner", v)} />
            </Row>
          </Section>
        )}

        {active === "mobile" && (
          <Section
            title="Mobile App"
            dirty={dirtyFor(MOBILE_KEYS)}
            saving={mobile.saving}
            saved={mobile.saved}
            error={mobile.error}
            onSave={() => mobile.run(() => saveSettings(MOBILE_KEYS))}
          >
            <Row label="Force update" hint="Block older app versions from using the app">
              <Switch checked={s.force_update} onCheckedChange={v => set("force_update", v)} />
            </Row>
            <StrRow
              label="Minimum app version" hint="Semver e.g. 1.2.0 — older versions see update screen"
              value={s.min_app_version} onChange={v => set("min_app_version", v)}
            />
            <Row label="Layout version" hint="v1 = classic, v2 = redesigned homepage">
              <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                {(["v1", "v2"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => set("layout_version", v)}
                    className={`px-3 py-1 text-sm transition-colors ${
                      s.layout_version === v
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Row>
          </Section>
        )}

        {active === "features" && (
          <Section
            title="Feature Flags"
            dirty={dirtyFlags(FLAG_KEYS)}
            saving={features.saving}
            saved={features.saved}
            error={features.error}
            onSave={() => features.run(() => saveFlags(FLAG_KEYS))}
          >
            <Row label="AI job matching" hint="Enable ML-based job-to-tradesperson matching">
              <Switch checked={f.ai_job_matching} onCheckedChange={v => setFlag("ai_job_matching", v)} />
            </Row>
            <Row label="Video quotes" hint="Allow tradespeople to send video quote responses">
              <Switch checked={f.video_quotes} onCheckedChange={v => setFlag("video_quotes", v)} />
            </Row>
            <Row label="Instant booking" hint="Let homeowners book directly without waiting for quotes">
              <Switch checked={f.instant_booking} onCheckedChange={v => setFlag("instant_booking", v)} />
            </Row>
          </Section>
        )}
      </div>
    </div>
  )
}
