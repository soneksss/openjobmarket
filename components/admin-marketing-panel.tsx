"use client"

import { Fragment, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tag, Users, Plus, Trash2, Pencil, X, Loader2, Save, CheckCircle,
  ChevronDown, ChevronUp, Gift, Rocket, ExternalLink,
} from "lucide-react"

// ── Shared bits ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  )
}

const inputCls = "w-full h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"

// ── Promo Codes ──────────────────────────────────────────────────────────────

interface MembershipPlanOption { id: string; key: string; name: string }

interface PromoCode {
  id: string
  code: string
  description: string | null
  is_active: boolean
  expires_at: string | null
  max_uses: number | null
  uses_count: number
  membership_plan_id: string | null
  free_days: number
  percent_discount: number | null
  fixed_discount_pence: number | null
  region: string | null
  new_users_only: boolean
  existing_members_allowed: boolean
  membership_plans?: { key: string; name: string } | null
  created_at: string
}

const emptyPromoForm = {
  code: "", description: "", expires_at: "", max_uses: "", membership_plan_id: "",
  free_days: "0", percent_discount: "", fixed_discount_pence: "", region: "",
  new_users_only: false, existing_members_allowed: true, is_active: true,
}

function PromoCodesTab() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [plans, setPlans] = useState<MembershipPlanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyPromoForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<Record<string, any[]>>({})

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/promo-codes").then(r => r.json()),
      fetch("/api/membership-plans").then(r => r.json()),
    ]).then(([codesData, plansData]) => {
      setCodes(codesData.promoCodes ?? [])
      setPlans(plansData.plans ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => { setForm(emptyPromoForm); setEditingId(null); setShowForm(true); setError(null) }

  const openEdit = (c: PromoCode) => {
    setForm({
      code: c.code,
      description: c.description ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      max_uses: c.max_uses?.toString() ?? "",
      membership_plan_id: c.membership_plan_id ?? "",
      free_days: c.free_days.toString(),
      percent_discount: c.percent_discount?.toString() ?? "",
      fixed_discount_pence: c.fixed_discount_pence?.toString() ?? "",
      region: c.region ?? "",
      new_users_only: c.new_users_only,
      existing_members_allowed: c.existing_members_allowed,
      is_active: c.is_active,
    })
    setEditingId(c.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.code.trim()) { setError("Code is required"); return }
    setSaving(true)
    setError(null)
    const payload = {
      code: form.code.trim(),
      description: form.description || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
      membership_plan_id: form.membership_plan_id || null,
      free_days: form.free_days ? parseInt(form.free_days, 10) : 0,
      percent_discount: form.percent_discount ? parseFloat(form.percent_discount) : null,
      fixed_discount_pence: form.fixed_discount_pence ? parseInt(form.fixed_discount_pence, 10) : null,
      region: form.region || null,
      new_users_only: form.new_users_only,
      existing_members_allowed: form.existing_members_allowed,
      is_active: form.is_active,
    }
    try {
      const res = await fetch(editingId ? `/api/admin/promo-codes/${editingId}` : "/api/admin/promo-codes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to save"); return }
      setShowForm(false)
      load()
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (c: PromoCode) => {
    setCodes(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
    await fetch(`/api/admin/promo-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code? This cannot be undone.")) return
    await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" })
    load()
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!redemptions[id]) {
      const res = await fetch(`/api/admin/promo-codes/${id}`)
      const data = await res.json()
      setRedemptions(prev => ({ ...prev, [id]: data.redemptions ?? [] }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{codes.length} promo code{codes.length === 1 ? "" : "s"}</p>
        <Button size="sm" onClick={openNew} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500">
          <Plus className="w-3 h-3 mr-1" /> New promo code
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-100">{editingId ? "Edit promo code" : "New promo code"}</span>
            <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-200"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Code">
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="LAUNCH30" />
            </Field>
            <Field label="Description">
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Free days">
              <Input type="number" min={0} value={form.free_days} onChange={e => setForm(f => ({ ...f, free_days: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Expires">
              <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Max uses (blank = unlimited)">
              <Input type="number" min={1} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Membership plan affected">
              <select
                value={form.membership_plan_id}
                onChange={e => setForm(f => ({ ...f, membership_plan_id: e.target.value }))}
                className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 text-sm px-2"
              >
                <option value="">Any / unspecified</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Percent discount (%)">
              <Input type="number" min={0} max={100} value={form.percent_discount} onChange={e => setForm(f => ({ ...f, percent_discount: e.target.value }))} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Fixed discount (pence)">
              <Input type="number" min={0} value={form.fixed_discount_pence} onChange={e => setForm(f => ({ ...f, fixed_discount_pence: e.target.value }))} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Region restriction">
              <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className={inputCls} placeholder="e.g. Portsmouth" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-5 pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <Switch checked={form.new_users_only} onCheckedChange={v => setForm(f => ({ ...f, new_users_only: v }))} />
              New users only
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <Switch checked={form.existing_members_allowed} onCheckedChange={v => setForm(f => ({ ...f, existing_members_allowed: v }))} />
              Existing members allowed
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="h-7 px-3 text-xs border-zinc-700 text-zinc-300">Cancel</Button>
            <Button size="sm" disabled={saving} onClick={handleSave} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span className="ml-1">Save</span>
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : codes.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">No promo codes yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900">
              <tr>
                {["Code", "Free days", "Uses", "Expires", "Active", ""].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <Fragment key={c.id}>
                  <tr className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleExpand(c.id)} className="flex items-center gap-1.5 font-mono font-semibold text-zinc-100">
                        {expandedId === c.id ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                        {c.code}
                      </button>
                      {c.description && <p className="text-xs text-zinc-500 mt-0.5 pl-5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">{c.free_days}</td>
                    <td className="px-4 py-2.5 text-zinc-300">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-4 py-2.5">
                      <Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr className="bg-zinc-950/50">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Redemptions</p>
                        {!redemptions[c.id] ? (
                          <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
                        ) : redemptions[c.id].length === 0 ? (
                          <p className="text-xs text-zinc-600">No redemptions yet.</p>
                        ) : (
                          <ul className="space-y-1">
                            {redemptions[c.id].map((r: any) => (
                              <li key={r.id} className="text-xs text-zinc-400 flex justify-between max-w-md">
                                <span>{r.company_profiles?.company_name ?? "Unknown company"}</span>
                                <span className="text-zinc-600">{new Date(r.redeemed_at).toLocaleDateString("en-GB")} · +{r.free_days_granted}d</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Referral Programme ────────────────────────────────────────────────────────

interface ReferralSettings {
  referral_program_enabled: boolean
  referral_reward_days_referrer: number
  referral_reward_days_referred: number
  first_job_reward_days: number
}

interface ReferralRow {
  id: string
  referral_code: string
  status: "pending" | "completed"
  referrer_reward_days: number | null
  referred_reward_days: number | null
  created_at: string
  referrer: { company_name: string } | null
  referred: { company_name: string } | null
}

function ReferralTab() {
  const [settings, setSettings] = useState<ReferralSettings | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rows, setRows] = useState<ReferralRow[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/app-config").then(r => r.json()),
      fetch("/api/admin/referrals").then(r => r.json()),
    ]).then(([config, referralsData]) => {
      setSettings({
        referral_program_enabled: config.settings.referral_program_enabled ?? true,
        referral_reward_days_referrer: config.settings.referral_reward_days_referrer ?? 30,
        referral_reward_days_referred: config.settings.referral_reward_days_referred ?? 30,
        first_job_reward_days: config.settings.first_job_reward_days ?? 30,
      })
      setRows(referralsData.referrals ?? [])
      setStats(referralsData.stats ?? { total: 0, completed: 0, pending: 0 })
    }).finally(() => setLoading(false))
  }, [])

  const update = (patch: Partial<ReferralSettings>) => {
    setSettings(s => s ? { ...s, ...patch } : s)
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) { setDirty(false); setSaved(true) }
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return <div className="p-6 text-center text-sm text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-100">Referral Programme</span>
          <div className="flex items-center gap-2">
            {saved && !dirty && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Saved</span>}
            {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
            <Button size="sm" disabled={!dirty || saving} onClick={handleSave} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span className="ml-1">{saving ? "Saving…" : "Save"}</span>
            </Button>
          </div>
        </div>
        <div className="px-5">
          <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-100">Referral programme</p>
              <p className="text-xs text-zinc-500 mt-0.5">When off, referral links still work but no bonus days are granted.</p>
            </div>
            <Switch checked={settings.referral_program_enabled} onCheckedChange={v => update({ referral_program_enabled: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800">
            <p className="text-sm text-zinc-400">Reward days — referrer</p>
            <Input type="number" min={0} value={settings.referral_reward_days_referrer}
              onChange={e => update({ referral_reward_days_referrer: parseInt(e.target.value || "0", 10) })}
              className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800">
            <p className="text-sm text-zinc-400">Reward days — new (referred) member</p>
            <Input type="number" min={0} value={settings.referral_reward_days_referred}
              onChange={e => update({ referral_reward_days_referred: parseInt(e.target.value || "0", 10) })}
              className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:border-0">
            <div>
              <p className="text-sm text-zinc-400">First-completed-job trial reward (days)</p>
              <p className="text-xs text-zinc-500 mt-0.5">Free Active Membership days granted after a tradesperson's first completed job.</p>
            </div>
            <Input type="number" min={0} value={settings.first_job_reward_days}
              onChange={e => update({ first_job_reward_days: parseInt(e.target.value || "0", 10) })}
              className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-100">Referrals</span>
          <span className="text-xs text-zinc-500">{stats.total} total · {stats.completed} completed · {stats.pending} pending</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">No referrals yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              <tr>
                {["Referrer", "Referred", "Status", "Rewards", "Date"].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-4 py-2.5 text-zinc-200">{r.referrer?.company_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-200">{r.referred?.company_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 text-xs">
                    {r.status === "completed" ? `+${r.referrer_reward_days}d / +${r.referred_reward_days}d` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Launch Mode ────────────────────────────────────────────────────────────

interface LaunchModePlan {
  id: string
  key: string
  name: string
  price_pence: number
}

interface LaunchModeSettings {
  subscriptions_enabled: boolean
  founding_member_headline: string
  founding_member_body: string
  billing_grace_period_days: number
  launch_mode_ended_at: string | null
}

function LaunchModeTab() {
  const [settings, setSettings] = useState<LaunchModeSettings | null>(null)
  const [plans, setPlans] = useState<LaunchModePlan[]>([])
  const [planEdits, setPlanEdits] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/app-config").then(r => r.json()),
      fetch("/api/membership-plans").then(r => r.json()),
    ]).then(([config, plansData]) => {
      setSettings({
        subscriptions_enabled: config.settings.subscriptions_enabled ?? false,
        founding_member_headline: config.settings.founding_member_headline ?? "🚀 Founding Member Programme",
        founding_member_body: config.settings.founding_member_body ?? "",
        billing_grace_period_days: config.settings.billing_grace_period_days ?? 30,
        launch_mode_ended_at: config.settings.launch_mode_ended_at ?? null,
      })
      const plansList: LaunchModePlan[] = plansData.plans ?? []
      setPlans(plansList)
      setPlanEdits(Object.fromEntries(plansList.map(p => [p.id, (p.price_pence / 100).toString()])))
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const update = (patch: Partial<LaunchModeSettings>) => {
    setSettings(s => s ? { ...s, ...patch } : s)
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            subscriptions_enabled: settings.subscriptions_enabled,
            founding_member_headline: settings.founding_member_headline,
            founding_member_body: settings.founding_member_body,
            billing_grace_period_days: settings.billing_grace_period_days,
          },
        }),
      })
      if (res.ok) { setDirty(false); setSaved(true); load() }
    } finally {
      setSaving(false)
    }
  }

  const handleSavePlanPrice = async (plan: LaunchModePlan) => {
    const pounds = parseFloat(planEdits[plan.id] ?? "0")
    if (isNaN(pounds) || pounds < 0) return
    setSavingPlanId(plan.id)
    try {
      await fetch(`/api/admin/membership-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_pence: Math.round(pounds * 100) }),
      })
      load()
    } finally {
      setSavingPlanId(null)
    }
  }

  if (loading || !settings) {
    return <div className="p-6 text-center text-sm text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" />Launch Mode</span>
          <div className="flex items-center gap-2">
            {saved && !dirty && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Saved</span>}
            {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
            <Button size="sm" disabled={!dirty || saving} onClick={handleSave} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span className="ml-1">{saving ? "Saving…" : "Save"}</span>
            </Button>
          </div>
        </div>
        <div className="px-5">
          <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-100">Launch Mode is {settings.subscriptions_enabled ? "OFF" : "ON"}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {settings.subscriptions_enabled
                  ? "Normal membership system is active — billing, trial and reward logic apply."
                  : "Everyone gets free Active Membership. Billing is disabled. Promo codes and referral rewards still work."}
              </p>
            </div>
            <Switch
              checked={!settings.subscriptions_enabled}
              onCheckedChange={v => update({ subscriptions_enabled: !v })}
            />
          </div>
          <div className="py-3 border-b border-zinc-800 space-y-1.5">
            <p className="text-sm font-medium text-zinc-100">Founding Member headline</p>
            <Input value={settings.founding_member_headline} onChange={e => update({ founding_member_headline: e.target.value })} className={inputCls} />
          </div>
          <div className="py-3 border-b border-zinc-800 space-y-1.5">
            <p className="text-sm font-medium text-zinc-100">Founding Member body text</p>
            <Textarea
              value={settings.founding_member_body}
              onChange={e => update({ founding_member_body: e.target.value })}
              className="w-full bg-zinc-800 border-zinc-700 text-zinc-100 text-sm min-h-20"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:border-0">
            <div>
              <p className="text-sm text-zinc-400">Grace period before billing starts (days)</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Applies to existing members once Launch Mode ends. {settings.launch_mode_ended_at
                  ? `Launch Mode ended ${new Date(settings.launch_mode_ended_at).toLocaleDateString("en-GB")}.`
                  : "Set automatically the first time Launch Mode is switched off."}
              </p>
            </div>
            <Input type="number" min={0} value={settings.billing_grace_period_days}
              onChange={e => update({ billing_grace_period_days: parseInt(e.target.value || "0", 10) })}
              className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-100">Future membership prices</span>
        </div>
        <div className="px-5">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
              <p className="text-sm text-zinc-400">{plan.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm">£</span>
                <Input
                  type="number" min={0} step="0.01"
                  value={planEdits[plan.id] ?? ""}
                  onChange={e => setPlanEdits(p => ({ ...p, [plan.id]: e.target.value }))}
                  className="w-24 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                />
                <Button size="sm" disabled={savingPlanId === plan.id} onClick={() => handleSavePlanPrice(plan)} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500">
                  {savingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-100">Preview Billing page</span>
        </div>
        <div className="px-5 py-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-7 px-3 text-xs border-zinc-700 text-zinc-300">
            <a href="/dashboard/company/subscription?preview=launch" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />Launch Mode
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-7 px-3 text-xs border-zinc-700 text-zinc-300">
            <a href="/dashboard/company/subscription?preview=normal" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />Normal Mode
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "promo", label: "Promo Codes", icon: Tag },
  { id: "referral", label: "Referral Programme", icon: Gift },
  { id: "launch", label: "Launch Mode", icon: Rocket },
] as const

export function AdminMarketingPanel() {
  const [active, setActive] = useState<typeof TABS[number]["id"]>("promo")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.id ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      {active === "promo" ? <PromoCodesTab /> : active === "referral" ? <ReferralTab /> : <LaunchModeTab />}
    </div>
  )
}
