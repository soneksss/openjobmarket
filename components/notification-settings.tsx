"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Bell, Mail, Loader2, Check, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/client"

interface NotificationPreferences {
  email_on_new_message: boolean
  email_on_job_application: boolean
  email_on_job_offer: boolean
  email_on_application_status_change: boolean
  email_digest_frequency: "instant" | "daily" | "weekly" | "never"
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_new_message: true,
    email_on_job_application: true,
    email_on_job_offer: true,
    email_on_application_status_change: true,
    email_digest_frequency: "instant",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Not authenticated")
        setLoading(false)
        return
      }

      // Get or create preferences
      const { data, error: prefsError } = await supabase.rpc("get_or_create_notification_preferences", {
        p_user_id: user.id,
      })

      if (prefsError) {
        console.error("[NOTIFICATION-SETTINGS] Error loading preferences:", prefsError)
        setError("Failed to load notification preferences")
        return
      }

      if (data && data.length > 0) {
        setPreferences(data[0])
      }
    } catch (err) {
      console.error("[NOTIFICATION-SETTINGS] Error:", err)
      setError("An error occurred while loading preferences")
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      setSaveSuccess(false)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Not authenticated")
        return
      }

      // Update preferences
      const { error: updateError } = await supabase
        .from("user_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            email_on_new_message: preferences.email_on_new_message,
            email_on_job_application: preferences.email_on_job_application,
            email_on_job_offer: preferences.email_on_job_offer,
            email_on_application_status_change: preferences.email_on_application_status_change,
            email_digest_frequency: preferences.email_digest_frequency,
          },
          {
            onConflict: "user_id",
          }
        )

      if (updateError) {
        console.error("[NOTIFICATION-SETTINGS] Error saving preferences:", updateError)
        setError("Failed to save preferences")
        return
      }

      console.log("[NOTIFICATION-SETTINGS] Preferences saved successfully")
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("[NOTIFICATION-SETTINGS] Error:", err)
      setError("An error occurred while saving preferences")
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>Choose which email notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <Check className="h-4 w-4" />
            Preferences saved successfully!
          </div>
        )}

        <div className="space-y-4">
          {/* New Messages */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-messages" className="text-base font-medium">
                  New Messages
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when someone sends you a message
              </p>
            </div>
            <Switch
              id="email-messages"
              checked={preferences.email_on_new_message}
              onCheckedChange={(checked) => updatePreference("email_on_new_message", checked)}
            />
          </div>

          {/* Job Applications */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-applications" className="text-base font-medium">
                  Job Applications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when someone applies to your job posting
              </p>
            </div>
            <Switch
              id="email-applications"
              checked={preferences.email_on_job_application}
              onCheckedChange={(checked) => updatePreference("email_on_job_application", checked)}
            />
          </div>

          {/* Job Offers */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-offers" className="text-base font-medium">
                  Job Offers & Inquiries
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when you receive a job offer or inquiry message
              </p>
            </div>
            <Switch
              id="email-offers"
              checked={preferences.email_on_job_offer}
              onCheckedChange={(checked) => updatePreference("email_on_job_offer", checked)}
            />
          </div>

          {/* Application Status Changes */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-status" className="text-base font-medium">
                  Application Status Changes
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when your application status is updated
              </p>
            </div>
            <Switch
              id="email-status"
              checked={preferences.email_on_application_status_change}
              onCheckedChange={(checked) =>
                updatePreference("email_on_application_status_change", checked)
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={loadPreferences} disabled={saving}>
            Reset
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium">Note:</p>
          <p className="mt-1">
            All email notifications are sent instantly. You can disable individual notification types
            by turning off the switches above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
