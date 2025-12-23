"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Mail, Newspaper, TrendingUp, Briefcase, Users, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/client"
import { toast } from "@/hooks/use-toast"

interface EmailPreference {
  id: string
  user_id: string

  // Email subscriptions
  weekly_digest: boolean
  job_alerts: boolean
  company_updates: boolean
  industry_insights: boolean
  success_stories: boolean
  tips_and_guides: boolean
  product_updates: boolean
  promotional_offers: boolean

  created_at: string
  updated_at: string
}

interface UserRoles {
  is_jobseeker: boolean
  is_homeowner: boolean
  is_employer: boolean
  is_tradespeople: boolean
}

interface EmailPreferencesProps {
  userId: string
}

export default function EmailPreferences({ userId }: EmailPreferencesProps) {
  const [preferences, setPreferences] = useState<EmailPreference | null>(null)
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      // Fetch user roles
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("is_jobseeker, is_homeowner, is_employer, is_tradespeople")
        .eq("id", userId)
        .single()

      if (userError) throw userError
      setUserRoles(userData)

      // Fetch email preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (prefsError && prefsError.code !== "PGRST116") {
        throw prefsError
      }

      if (prefsData) {
        setPreferences(prefsData)
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: userId,
          weekly_digest: true,
          job_alerts: userData.is_jobseeker || userData.is_tradespeople,
          company_updates: true,
          industry_insights: userData.is_employer,
          success_stories: false,
          tips_and_guides: true,
          product_updates: true,
          promotional_offers: false,
        }

        const { data: newPrefs, error: createError } = await supabase
          .from("email_preferences")
          .insert(defaultPrefs)
          .select()
          .single()

        if (createError) throw createError
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error("Error fetching email preferences:", error)
      toast({
        title: "Error",
        description: "Failed to load email preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: keyof EmailPreference, value: boolean) => {
    if (!preferences) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("email_preferences")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId)

      if (error) throw error

      setPreferences({ ...preferences, [key]: value })
      toast({
        title: "Preferences Updated",
        description: "Your email preferences have been saved",
      })
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading email preferences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences || !userRoles) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Failed to load email preferences</p>
        </CardContent>
      </Card>
    )
  }

  interface EmailSetting {
    key: keyof EmailPreference
    label: string
    description: string
    icon: any
    roleCheck?: (roles: UserRoles) => boolean
  }

  const emailSettings: EmailSetting[] = [
    {
      key: "weekly_digest",
      label: "Weekly Digest",
      description: "Receive a weekly summary of platform activity, new opportunities, and relevant updates",
      icon: Newspaper,
    },
    {
      key: "job_alerts",
      label: "Job Alerts",
      description: "Get notified about new jobs and opportunities matching your profile and preferences",
      icon: Briefcase,
      roleCheck: (roles) => roles.is_jobseeker || roles.is_tradespeople,
    },
    {
      key: "company_updates",
      label: "Company Updates",
      description: "Important announcements, platform improvements, and new features",
      icon: CheckCircle2,
    },
    {
      key: "industry_insights",
      label: "Industry Insights",
      description: "Market trends, hiring insights, and industry news relevant to your field",
      icon: TrendingUp,
      roleCheck: (roles) => roles.is_employer || roles.is_jobseeker,
    },
    {
      key: "success_stories",
      label: "Success Stories",
      description: "Inspiring stories from users who found success through Open Job Market",
      icon: Users,
    },
    {
      key: "tips_and_guides",
      label: "Tips & Guides",
      description: "Helpful tips for job searching, hiring, and making the most of the platform",
      icon: AlertCircle,
    },
    {
      key: "product_updates",
      label: "Product Updates",
      description: "Get early access to new features, beta programs, and product announcements",
      icon: Mail,
    },
    {
      key: "promotional_offers",
      label: "Promotional Offers",
      description: "Special discounts, promotional offers, and exclusive deals for members",
      icon: TrendingUp,
    },
  ]

  const filteredSettings = emailSettings.filter(
    (setting) => !setting.roleCheck || setting.roleCheck(userRoles)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Subscription Preferences
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your email subscriptions and choose what you'd like to hear about
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredSettings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start space-x-3 flex-1">
                <setting.icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor={setting.key} className="text-base font-medium cursor-pointer">
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={preferences[setting.key] as boolean}
                onCheckedChange={(checked) => updatePreference(setting.key, checked)}
                disabled={saving}
                className="ml-4"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">About Email Preferences</h4>
              <p className="text-sm text-blue-700 mt-1">
                These settings control marketing and informational emails. Critical account-related emails
                (like security alerts, password resets, and account notifications) will always be sent regardless
                of these settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
