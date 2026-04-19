"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, Phone, MessageSquare, Briefcase, AlertTriangle, Home, Building2, Wrench, Users, Globe, Languages, Zap } from "lucide-react"
import { createClient } from "@/lib/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { Language, Country } from "@/lib/i18n/language-region"
import { LANGUAGES, COUNTRIES, saveLanguageRegionToStorage } from "@/lib/i18n/language-region"

interface NotificationPreference {
  id: string
  user_id: string

  // Common
  email_messages: boolean
  phone_messages: boolean

  // Homeowner
  email_job_response: boolean
  phone_job_response: boolean
  email_job_expired: boolean
  phone_job_expired: boolean

  // Employer
  email_vacancy_response: boolean
  phone_vacancy_response: boolean
  email_vacancy_expired: boolean
  phone_vacancy_expired: boolean

  // Tradesperson
  email_application_response: boolean
  phone_application_response: boolean
  email_matching_jobs: boolean
  phone_matching_jobs: boolean

  // Jobseeker
  email_job_matches: boolean
  phone_job_matches: boolean

  // Marketing
  email_marketing: boolean
  phone_marketing: boolean

  created_at: string
  updated_at: string
}

interface UserRoles {
  is_jobseeker: boolean
  is_homeowner: boolean
  is_employer: boolean
  is_tradespeople: boolean
}

interface NotificationPreferencesProps {
  userId: string
}

export default function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [country, setCountry] = useState<Country>('GLOBAL')
  const router = useRouter()
  const supabase = createClient()

  // Tradesperson push-alert toggles (stored on company_profiles, not notification_preferences)
  const [urgentJobAlerts,   setUrgentJobAlerts]   = useState(true)
  const [flexibleJobAlerts, setFlexibleJobAlerts] = useState(true)
  const [savingPush, setSavingPush] = useState(false)

  useEffect(() => {
    fetchData()
    loadLanguagePreference()
  }, [userId])

  const loadLanguagePreference = () => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('language-region')
        if (stored) {
          const parsed = JSON.parse(stored)
          setLanguage(parsed.language || 'en')
          setCountry(parsed.country || 'GLOBAL')
        }
      } catch (error) {
        console.error('Failed to load language preference:', error)
      }
    }
  }

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

      // Fetch notification preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (prefsError && prefsError.code !== "PGRST116") {
        throw prefsError
      }

      // Fetch tradesperson push toggles from company_profiles
      if (userData.is_tradespeople) {
        const { data: cp } = await supabase
          .from('company_profiles')
          .select('trade_job_notifications, flexible_job_notifications')
          .eq('user_id', userId)
          .maybeSingle()
        if (cp) {
          setUrgentJobAlerts(cp.trade_job_notifications ?? true)
          setFlexibleJobAlerts(cp.flexible_job_notifications ?? true)
        }
      }

      if (prefsData) {
        setPreferences(prefsData)
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: userId,
          email_messages: true,
          phone_messages: false,
          email_job_response: true,
          phone_job_response: false,
          email_job_expired: true,
          phone_job_expired: false,
          email_vacancy_response: true,
          phone_vacancy_response: false,
          email_vacancy_expired: true,
          phone_vacancy_expired: false,
          email_application_response: true,
          phone_application_response: false,
          email_matching_jobs: userData.is_tradespeople,
          phone_matching_jobs: false,
          email_job_matches: userData.is_jobseeker,
          phone_job_matches: false,
          email_marketing: false,
          phone_marketing: false,
        }

        const { data: newPrefs, error: createError } = await supabase
          .from("notification_preferences")
          .insert(defaultPrefs)
          .select()
          .single()

        if (createError) throw createError
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: keyof NotificationPreference, value: boolean) => {
    if (!preferences) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId)

      if (error) throw error

      setPreferences({ ...preferences, [key]: value })
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
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

  const savePushAlert = async (field: 'trade_job_notifications' | 'flexible_job_notifications', value: boolean) => {
    setSavingPush(true)
    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({ [field]: value })
        .eq('user_id', userId)
      if (error) throw error
      if (field === 'trade_job_notifications')   setUrgentJobAlerts(value)
      if (field === 'flexible_job_notifications') setFlexibleJobAlerts(value)
      toast({ title: 'Push alerts updated' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update push alerts', variant: 'destructive' })
    } finally {
      setSavingPush(false)
    }
  }

  const handleLanguageChange = (newLang: Language) => {
    const newCountry: Country = newLang === 'pt-BR' ? 'BR' : 'GLOBAL'

    setLanguage(newLang)
    setCountry(newCountry)

    // Save to localStorage
    saveLanguageRegionToStorage({ language: newLang, country: newCountry })

    // Navigate to the appropriate route
    const currentPath = window.location.pathname
    const pathWithoutLocale = currentPath.startsWith('/br/') ? currentPath.slice(3) : currentPath.replace('/br', '')
    const newPath = newLang === 'pt-BR' ? `/br${pathWithoutLocale}` : pathWithoutLocale || '/'

    toast({
      title: "Language Updated",
      description: `Language changed to ${newLang === 'en' ? 'English' : 'Portuguese (Brasil)'}. Refreshing page...`,
    })

    // Refresh to apply new language
    setTimeout(() => {
      window.location.href = newPath
    }, 500)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences || !userRoles) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Failed to load notification preferences</p>
        </CardContent>
      </Card>
    )
  }

  interface NotificationSetting {
    label: string
    description: string
    emailKey: keyof NotificationPreference
    phoneKey: keyof NotificationPreference
  }

  interface NotificationCategory {
    title: string
    icon: any
    description: string
    roleCheck: (roles: UserRoles) => boolean
    settings: NotificationSetting[]
  }

  const notificationCategories: NotificationCategory[] = [
    {
      title: "Messages",
      icon: MessageSquare,
      description: "Communication and messaging notifications",
      roleCheck: () => true, // All users
      settings: [
        {
          label: "New Messages",
          description: "Get notified when someone sends you a message",
          emailKey: "email_messages",
          phoneKey: "phone_messages",
        },
      ],
    },
    {
      title: "Homeowner",
      icon: Home,
      description: "Notifications for posted jobs and tasks",
      roleCheck: (roles) => roles.is_homeowner,
      settings: [
        {
          label: "Job Responses",
          description: "When someone responds to your posted job/task",
          emailKey: "email_job_response",
          phoneKey: "phone_job_response",
        },
        {
          label: "Job Expiration",
          description: "When your posted job/task is about to expire",
          emailKey: "email_job_expired",
          phoneKey: "phone_job_expired",
        },
      ],
    },
    {
      title: "Employer",
      icon: Building2,
      description: "Notifications for posted vacancies",
      roleCheck: (roles) => roles.is_employer,
      settings: [
        {
          label: "Vacancy Responses",
          description: "When someone responds to your posted vacancy",
          emailKey: "email_vacancy_response",
          phoneKey: "phone_vacancy_response",
        },
        {
          label: "Vacancy Expiration",
          description: "When your posted vacancy is about to expire",
          emailKey: "email_vacancy_expired",
          phoneKey: "phone_vacancy_expired",
        },
      ],
    },
    {
      title: "Tradesperson",
      icon: Wrench,
      description: "Notifications for jobs and applications",
      roleCheck: (roles) => roles.is_tradespeople,
      settings: [
        {
          label: "Vacancy Responses",
          description: "When someone responds to your posted vacancy",
          emailKey: "email_vacancy_response",
          phoneKey: "phone_vacancy_response",
        },
        {
          label: "Vacancy Expiration",
          description: "When your posted vacancy is about to expire",
          emailKey: "email_vacancy_expired",
          phoneKey: "phone_vacancy_expired",
        },
        {
          label: "Application Responses",
          description: "When someone responds to your application",
          emailKey: "email_application_response",
          phoneKey: "phone_application_response",
        },
        {
          label: "Matching Jobs",
          description: "New jobs matching your services within 10 miles radius",
          emailKey: "email_matching_jobs",
          phoneKey: "phone_matching_jobs",
        },
      ],
    },
    {
      title: "Jobseeker",
      icon: Users,
      description: "Notifications for jobs and applications",
      roleCheck: (roles) => roles.is_jobseeker,
      settings: [
        {
          label: "Vacancy Responses",
          description: "When someone responds to your posted vacancy",
          emailKey: "email_vacancy_response",
          phoneKey: "phone_vacancy_response",
        },
        {
          label: "Application Responses",
          description: "When someone responds to your application",
          emailKey: "email_application_response",
          phoneKey: "phone_application_response",
        },
        {
          label: "Job Matches",
          description: "New jobs matching your skills within 10 miles radius",
          emailKey: "email_job_matches",
          phoneKey: "phone_job_matches",
        },
      ],
    },
    {
      title: "Marketing",
      icon: Mail,
      description: "Updates and promotional content",
      roleCheck: () => true, // All users
      settings: [
        {
          label: "Marketing Communications",
          description: "Receive updates about new features and promotions",
          emailKey: "email_marketing",
          phoneKey: "phone_marketing",
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Language & Region Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Language & Region
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your preferred language and region
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="language-select" className="text-sm font-medium">
                Language
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select your preferred language for the interface
              </p>
              <Select value={language} onValueChange={(value) => handleLanguageChange(value as Language)}>
                <SelectTrigger id="language-select" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span>🌐</span>
                      <span>English - Global</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pt-BR">
                    <div className="flex items-center gap-2">
                      <span>🇧🇷</span>
                      <span>Português - Brasil</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Changing your language will reload the page to apply the new settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tradesperson push-alert toggles */}
      {userRoles?.is_tradespeople && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-orange-500" />
              Job Alerts (Push)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Push notifications sent when matching jobs are posted near you.
              Your <strong>Available</strong> toggle on the home page is the master switch —
              you only receive alerts when you are marked available.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">🚨 Urgent Jobs (ASAP / Today)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Immediate alerts for jobs that need same-day or next-hour response
                </p>
              </div>
              <Switch
                checked={urgentJobAlerts}
                onCheckedChange={v => savePushAlert('trade_job_notifications', v)}
                disabled={savingPush}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">📋 Flexible Jobs (1–7 days)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifications for jobs posted with a flexible timeline — apply at your convenience
                </p>
              </div>
              <Switch
                checked={flexibleJobAlerts}
                onCheckedChange={v => savePushAlert('flexible_job_notifications', v)}
                disabled={savingPush}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Preferences Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Preferences
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how and when you want to be notified about important updates
          </p>
        </CardHeader>
      </Card>

      {notificationCategories.map((category) => {
        // Check if this category is relevant for the user's roles
        if (!category.roleCheck(userRoles)) return null

        return (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <category.icon className="h-5 w-5 mr-2" />
                {category.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {category.settings.map((setting) => (
                <div key={setting.label} className="space-y-3">
                  <div>
                    <h4 className="font-medium">{setting.label}</h4>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <div className="flex items-center space-x-6">
                    {/* Email Toggle */}
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`${setting.emailKey}-email`} className="text-sm font-normal">
                        Email
                      </Label>
                      <Switch
                        id={`${setting.emailKey}-email`}
                        checked={preferences[setting.emailKey] as boolean}
                        onCheckedChange={(checked) => updatePreference(setting.emailKey, checked)}
                        disabled={saving}
                      />
                    </div>
                    {/* Phone Toggle */}
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`${setting.phoneKey}-phone`} className="text-sm font-normal">
                        Phone
                      </Label>
                      <Switch
                        id={`${setting.phoneKey}-phone`}
                        checked={preferences[setting.phoneKey] as boolean}
                        onCheckedChange={(checked) => updatePreference(setting.phoneKey, checked)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">Important Notifications</h4>
              <p className="text-sm text-orange-700 mt-1">
                Some notifications like security alerts and account changes cannot be disabled for your protection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
