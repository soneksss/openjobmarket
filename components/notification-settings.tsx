"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, Loader2, Check, AlertCircle, Briefcase } from "lucide-react"
import { createClient } from "@/lib/client"

interface NotificationPreferences {
  email_on_new_message: boolean
  email_on_job_application: boolean
  email_on_job_offer: boolean
  email_on_application_status_change: boolean
  email_on_trade_job_match: boolean
  email_digest_frequency: "instant" | "daily" | "weekly" | "never"
}

interface CompanyTradeSettings {
  trade_job_notifications: boolean
  trade_job_notifications_distance: number
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_new_message: true,
    email_on_job_application: true,
    email_on_job_offer: true,
    email_on_application_status_change: true,
    email_on_trade_job_match: true,
    email_digest_frequency: "instant",
  })
  const [companyTradeSettings, setCompanyTradeSettings] = useState<CompanyTradeSettings | null>(null)
  const [isCompanyUser, setIsCompanyUser] = useState(false)
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

      // Check if user is a company
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()

      const isCompany = userData?.user_type === "company"
      setIsCompanyUser(isCompany)

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
        setPreferences({
          ...preferences,
          ...data[0],
          // Ensure email_on_trade_job_match has a default value
          email_on_trade_job_match: data[0].email_on_trade_job_match ?? true,
        })
      }

      // If company user, also load company-specific trade settings
      if (isCompany) {
        const { data: companyData, error: companyError } = await supabase
          .from("company_profiles")
          .select("trade_job_notifications, trade_job_notifications_distance")
          .eq("user_id", user.id)
          .single()

        if (companyError) {
          console.error("[NOTIFICATION-SETTINGS] Error loading company settings:", companyError)
        } else if (companyData) {
          setCompanyTradeSettings({
            trade_job_notifications: companyData.trade_job_notifications ?? false,
            trade_job_notifications_distance: companyData.trade_job_notifications_distance ?? 10,
          })
        }
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

      // Update user notification preferences
      const { error: updateError } = await supabase
        .from("user_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            email_on_new_message: preferences.email_on_new_message,
            email_on_job_application: preferences.email_on_job_application,
            email_on_job_offer: preferences.email_on_job_offer,
            email_on_application_status_change: preferences.email_on_application_status_change,
            email_on_trade_job_match: preferences.email_on_trade_job_match,
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

      // If company user, also update company-specific trade settings
      if (isCompanyUser && companyTradeSettings) {
        const { error: companyError } = await supabase
          .from("company_profiles")
          .update({
            trade_job_notifications: companyTradeSettings.trade_job_notifications,
            trade_job_notifications_distance: companyTradeSettings.trade_job_notifications_distance,
          })
          .eq("user_id", user.id)

        if (companyError) {
          console.error("[NOTIFICATION-SETTINGS] Error saving company settings:", companyError)
          setError("Failed to save trade job notification settings")
          return
        }
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

          {/* Trade Job Match Notifications - Only for company users */}
          {isCompanyUser && companyTradeSettings && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-600" />
                    <Label htmlFor="trade-notifications" className="text-base font-medium">
                      Trade Job Notifications
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get notified when matching trade jobs are posted nearby
                  </p>
                </div>
                <Switch
                  id="trade-notifications"
                  checked={companyTradeSettings.trade_job_notifications}
                  onCheckedChange={(checked) =>
                    setCompanyTradeSettings((prev) =>
                      prev ? { ...prev, trade_job_notifications: checked } : null
                    )
                  }
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              {companyTradeSettings.trade_job_notifications && (
                <>
                  <div className="flex items-center justify-between space-x-4 pt-2 border-t border-purple-200">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="trade-distance" className="text-sm font-medium">
                        Notification Radius
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Only notify for jobs within this distance
                      </p>
                    </div>
                    <Select
                      value={companyTradeSettings.trade_job_notifications_distance.toString()}
                      onValueChange={(value) =>
                        setCompanyTradeSettings((prev) =>
                          prev ? { ...prev, trade_job_notifications_distance: parseInt(value) } : null
                        )
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 miles</SelectItem>
                        <SelectItem value="10">10 miles</SelectItem>
                        <SelectItem value="15">15 miles</SelectItem>
                        <SelectItem value="20">20 miles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between space-x-4 pt-2 border-t border-purple-200">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="email-trade" className="text-sm font-medium">
                          Email Notifications
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Receive email for matching trade jobs
                      </p>
                    </div>
                    <Switch
                      id="email-trade"
                      checked={preferences.email_on_trade_job_match}
                      onCheckedChange={(checked) =>
                        updatePreference("email_on_trade_job_match", checked)
                      }
                    />
                  </div>

                  <div className="text-xs text-purple-700 bg-purple-100 rounded p-2 mt-2">
                    <strong>How it works:</strong> You'll receive notifications in your notification bell
                    {preferences.email_on_trade_job_match ? " and email" : ""} when trade jobs are posted that:
                    <ul className="list-disc list-inside mt-1">
                      <li>Match your company's services/skills</li>
                      <li>Are within {companyTradeSettings.trade_job_notifications_distance} miles of your location</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
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
