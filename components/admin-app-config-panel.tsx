"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertTriangle, Smartphone, Zap, Layout, Bell } from 'lucide-react'

/**
 * AdminAppConfigPanel — controls remote app configuration from the admin dashboard.
 *
 * Manages:
 *   Feature flags  — ai_job_matching, video_quotes, instant_booking
 *   UI toggles     — urgent_jobs_banner, promotions_banner
 *   Layout version — v1 (current) / v2 (new design)
 *   Version gate   — minAppVersion + forceUpdate (blocks old native app versions)
 *
 * Changes are persisted via POST /api/admin/app-config and immediately bust
 * the 'admin-settings' server cache so all users see the update within seconds.
 */

interface AppConfig {
  settings: {
    layout_version: string
    ui_urgent_jobs_banner: boolean
    ui_promotions_banner: boolean
    min_app_version: string
    force_update: boolean
  }
  featureFlags: {
    ai_job_matching: boolean
    video_quotes: boolean
    instant_booking: boolean
  }
}

const DEFAULT_CONFIG: AppConfig = {
  settings: {
    layout_version: 'v1',
    ui_urgent_jobs_banner: true,
    ui_promotions_banner: false,
    min_app_version: '1.0.0',
    force_update: false,
  },
  featureFlags: {
    ai_job_matching: false,
    video_quotes: false,
    instant_booking: false,
  },
}

export function AdminAppConfigPanel() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/app-config')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      setConfig({
        settings: {
          layout_version:        data.settings?.layout_version        ?? 'v1',
          ui_urgent_jobs_banner: data.settings?.ui_urgent_jobs_banner ?? true,
          ui_promotions_banner:  data.settings?.ui_promotions_banner  ?? false,
          min_app_version:       data.settings?.min_app_version       ?? '1.0.0',
          force_update:          data.settings?.force_update          ?? false,
        },
        featureFlags: {
          ai_job_matching: data.featureFlags?.ai_job_matching ?? false,
          video_quotes:    data.featureFlags?.video_quotes    ?? false,
          instant_booking: data.featureFlags?.instant_booking ?? false,
        },
      })
    } catch (err: any) {
      setError(`Failed to load config: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function setFlag(key: keyof AppConfig['featureFlags'], value: boolean) {
    setConfig(c => ({ ...c, featureFlags: { ...c.featureFlags, [key]: value } }))
  }

  function setSetting<K extends keyof AppConfig['settings']>(key: K, value: AppConfig['settings'][K]) {
    setConfig(c => ({ ...c, settings: { ...c.settings, [key]: value } }))
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center text-slate-400 text-sm">
          Loading app config…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Feature Flags */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-emerald-400" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'ai_job_matching' as const, label: 'AI Job Matching', desc: 'Enables AI-powered job recommendations' },
            { key: 'video_quotes'    as const, label: 'Video Quotes',    desc: 'Allows tradespeople to send video quotes' },
            { key: 'instant_booking' as const, label: 'Instant Booking', desc: 'Enables one-tap job booking flow' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-slate-200 text-sm font-medium">{label}</Label>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <Switch
                checked={config.featureFlags[key]}
                onCheckedChange={v => setFlag(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* UI Toggles */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-blue-400" />
            UI Toggles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200 text-sm font-medium">Urgent Jobs Banner</Label>
              <p className="text-xs text-slate-500 mt-0.5">Show the urgent jobs alert banner on the homepage</p>
            </div>
            <Switch
              checked={config.settings.ui_urgent_jobs_banner}
              onCheckedChange={v => setSetting('ui_urgent_jobs_banner', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200 text-sm font-medium">Promotions Banner</Label>
              <p className="text-xs text-slate-500 mt-0.5">Show the promotions / seasonal offer banner</p>
            </div>
            <Switch
              checked={config.settings.ui_promotions_banner}
              onCheckedChange={v => setSetting('ui_promotions_banner', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Version */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Layout className="w-4 h-4 text-purple-400" />
            Homepage Layout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(['v1', 'v2'] as const).map(v => (
              <button
                key={v}
                onClick={() => setSetting('layout_version', v)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  config.settings.layout_version === v
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Layout {v.toUpperCase()}
                {v === 'v1' && <span className="ml-1 text-xs opacity-70">(current)</span>}
                {v === 'v2' && <span className="ml-1 text-xs opacity-70">(new)</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Version Gate */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-orange-400" />
            App Version Gate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-200 text-sm font-medium">Minimum App Version</Label>
            <p className="text-xs text-slate-500 mb-2">Users below this version see the update screen (when Force Update is on)</p>
            <Input
              value={config.settings.min_app_version}
              onChange={e => setSetting('min_app_version', e.target.value)}
              placeholder="1.0.0"
              className="bg-slate-700 border-slate-600 text-white text-sm max-w-[150px]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200 text-sm font-medium flex items-center gap-1">
                Force Update
                {config.settings.force_update && (
                  <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">ACTIVE</span>
                )}
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Block users below minimum version from using the app
              </p>
            </div>
            <Switch
              checked={config.settings.force_update}
              onCheckedChange={v => setSetting('force_update', v)}
            />
          </div>
          {config.settings.force_update && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Force update is ON. Users with app version below{' '}
                <strong>{config.settings.min_app_version}</strong> will see a blocking
                "Update Required" screen and cannot use the app until they update.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button + status */}
      <div className="flex items-center gap-3">
        <Button
          onClick={saveConfig}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {saving ? 'Saving…' : 'Save App Config'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            Saved — changes live immediately
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
