"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

// Only the switches the site actually reads. Vacancies is the vacancy_system
// feature flag — the same one the database checks before accepting applications.

interface Settings {
  signin_required_to_search: boolean
  min_app_version: string
  force_update: boolean
}

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

export function AdminSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ s: Settings; vacancies: boolean } | null>(null)
  const [s, setS] = useState<Settings | null>(null)
  const [vacancies, setVacancies] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/app-config")
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        const settings: Settings = {
          signin_required_to_search: data.settings.signin_required_to_search ?? false,
          min_app_version:           data.settings.min_app_version           ?? "1.0.0",
          force_update:              data.settings.force_update              ?? false,
        }
        const vac = data.featureFlags.vacancy_system ?? false
        setS(settings); setVacancies(vac); setSaved({ s: settings, vacancies: vac })
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…</div>
  }
  if (loadError || !s || !saved) {
    return (
      <div className="flex items-center gap-2 text-red-400 p-4 rounded-lg border border-red-800 bg-red-950/30">
        <AlertCircle className="w-4 h-4 shrink-0" /><span className="text-sm">{loadError ?? "Failed to load settings"}</span>
      </div>
    )
  }

  const dirty = vacancies !== saved.vacancies || (Object.keys(s) as (keyof Settings)[]).some(k => s[k] !== saved.s[k])
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setJustSaved(false); setS({ ...s, [k]: v }) }

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s, featureFlags: { vacancy_system: vacancies } }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? "Save failed")
      setSaved({ s, vacancies }); setJustSaved(true)
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-b border-zinc-800 bg-zinc-900">
        {error && <span className="text-xs text-red-400">{error}</span>}
        {justSaved && !dirty && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Saved</span>}
        {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
        <Button size="sm" disabled={!dirty || saving} onClick={save} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          <span className="ml-1">{saving ? "Saving…" : "Save"}</span>
        </Button>
      </div>
      <div className="px-5">
        <Row label="Vacancies" hint="Show the Vacancies tab and let businesses post vacancies and people apply">
          <Switch checked={vacancies} onCheckedChange={v => { setJustSaved(false); setVacancies(v) }} />
        </Row>
        <Row label="Sign-in required to search" hint="Hide jobs and tradespeople from visitors who aren't signed in">
          <Switch checked={s.signin_required_to_search} onCheckedChange={v => set("signin_required_to_search", v)} />
        </Row>
        <Row label="Force app update" hint="Mobile app: block versions older than the minimum below">
          <Switch checked={s.force_update} onCheckedChange={v => set("force_update", v)} />
        </Row>
        <Row label="Minimum app version" hint="e.g. 1.2.0">
          <Input value={s.min_app_version} onChange={e => set("min_app_version", e.target.value)}
            className="w-32 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
        </Row>
      </div>
    </div>
  )
}
