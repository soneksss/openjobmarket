"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Settings, AlertTriangle, CheckCircle, Crown, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/client"

interface AdminSettings {
  subscriptions_enabled: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    subscriptions_enabled: false,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      console.log("[ADMIN-SETTINGS] Loading admin settings...")
      const { data, error } = await supabase.rpc('get_admin_settings')

      if (error) {
        console.error("Error loading admin settings:", error)
        if (error.message.includes('Admin privileges required')) {
          setError("Admin access required. Please ensure you are logged in as an administrator.")
        } else if (error.message.includes('function') && error.message.includes('does not exist')) {
          setError("Admin settings system not initialized. Please run the database setup script.")
        } else {
          setError(`Failed to load settings: ${error.message}`)
        }
      } else if (data) {
        console.log("[ADMIN-SETTINGS] Settings loaded successfully:", data)
        setSettings(data)
      } else {
        setError("No admin settings data returned")
      }
    } catch (err: any) {
      console.error("Exception loading admin settings:", err)
      setError(`Failed to load settings: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setError(null)

    try {
      console.log("[ADMIN-SETTINGS] Saving admin settings:", settings)
      const { data, error } = await supabase.rpc('update_admin_settings', {
        settings_json: settings
      })

      if (error) {
        console.error("Error saving admin settings:", error)
        if (error.message.includes('Admin privileges required')) {
          setError("Admin access required. Please ensure you are logged in as an administrator.")
        } else {
          setError(`Failed to save settings: ${error.message}`)
        }
      } else if (data) {
        console.log("[ADMIN-SETTINGS] Settings saved successfully")
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)

        // Reload settings to ensure UI is in sync
        await loadSettings()
      } else {
        setError("Save operation completed but no confirmation received")
      }
    } catch (err: any) {
      console.error("Exception saving admin settings:", err)
      setError(`Failed to save settings: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = <K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-muted-foreground animate-spin" />
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Configure platform subscription model</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              Settings saved successfully
            </div>
          )}
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600 mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
            {error.includes('database setup script') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Database Setup Required</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  The admin settings system needs to be initialized. Please run the following SQL script in your Supabase dashboard:
                </p>
                <code className="text-xs bg-yellow-100 p-2 rounded block text-yellow-900 font-mono">
                  CREATE_ADMIN_SETTINGS_COMPLETE.sql
                </code>
                <p className="text-xs text-yellow-600 mt-2">
                  This script is located in your project root directory.
                </p>
              </div>
            )}
            {error.includes('Admin access required') && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Admin Authentication</h4>
                <p className="text-sm text-blue-700">
                  You need administrator privileges to access this page. Please ensure you're logged in with an admin account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">

        {/* Subscription Model Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Subscription Model</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Enable Subscription-Based Pricing</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, users must purchase subscriptions to access platform features. When disabled, all features are free.
                </p>
              </div>
              <Switch
                checked={settings.subscriptions_enabled}
                onCheckedChange={(checked) => handleSettingChange("subscriptions_enabled", checked)}
              />
            </div>

            {settings.subscriptions_enabled ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="text-sm font-medium text-green-800">Subscription Model Active</h4>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    All platform pricing is now controlled through subscription plans. Users need active subscriptions to access premium features.
                  </p>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <h5 className="text-xs font-medium text-green-800 mb-2">Pricing Rules:</h5>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• Price = £0 → Free tier with unlimited features</li>
                      <li>• Price {'>'} £0 → Paid subscription with defined limitations</li>
                      <li>• Inactive plans are hidden from users</li>
                    </ul>
                  </div>
                </div>

                <Link href="/admin/subscriptions">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Crown className="h-4 w-4 mr-2" />
                    Manage Subscription Plans
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-blue-800">Free Platform Mode</h4>
                </div>
                <p className="text-sm text-blue-700">
                  All platform features are currently free for all users. Enable subscriptions to start monetizing your platform.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Status Overview */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800">Platform Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Billing Model:</span>
              <span className={settings.subscriptions_enabled ? "text-blue-600 font-semibold" : "text-green-600 font-semibold"}>
                {settings.subscriptions_enabled ? "Subscription-Based" : "Free Platform"}
              </span>
            </div>

            {settings.subscriptions_enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Pricing is controlled through subscription plans. Visit the Subscription Plans page to configure pricing and features.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}