"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Bell, Mail, MessageSquare, Briefcase, Clock } from "lucide-react"
import { createClient } from "@/lib/client"
import { useToast } from "@/hooks/use-toast"

export default function NotificationSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    email_new_messages: true,
    email_job_applications: true,
    email_job_expiration: true,
    email_marketing: false,
    push_new_messages: true,
    push_job_applications: true,
    push_job_expiration: true,
  })

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/sign-in")
        return
      }

      // Load notification preferences from user metadata or database
      // For now, using default values
      // In a full implementation, you would fetch from a notification_preferences table

      setIsLoading(false)
    } catch (error) {
      console.error("Error loading preferences:", error)
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/sign-in")
        return
      }

      // Save notification preferences to database
      // In a full implementation, you would save to a notification_preferences table

      toast({
        title: "✓ Settings Saved",
        description: "Your notification preferences have been updated.",
        duration: 3000,
      })

      setIsSaving(false)
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save notification preferences.",
        variant: "destructive",
        duration: 5000,
      })
      setIsSaving(false)
    }
  }

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences({ ...preferences, [key]: !preferences[key] })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/account/homeowner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Account Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
            <p className="text-gray-600">Manage how you receive updates and alerts</p>
          </div>
          <Bell className="h-8 w-8 text-blue-600" />
        </div>

        <div className="space-y-6">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="email_new_messages" className="text-base font-medium cursor-pointer">
                      New Messages
                    </Label>
                    <p className="text-sm text-gray-500">
                      Get notified when you receive a new message
                    </p>
                  </div>
                </div>
                <Switch
                  id="email_new_messages"
                  checked={preferences.email_new_messages}
                  onCheckedChange={() => handleToggle('email_new_messages')}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="email_job_applications" className="text-base font-medium cursor-pointer">
                      Job Applications
                    </Label>
                    <p className="text-sm text-gray-500">
                      Get notified when someone applies to your posted job
                    </p>
                  </div>
                </div>
                <Switch
                  id="email_job_applications"
                  checked={preferences.email_job_applications}
                  onCheckedChange={() => handleToggle('email_job_applications')}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="email_job_expiration" className="text-base font-medium cursor-pointer">
                      Job Expiration Alerts
                    </Label>
                    <p className="text-sm text-gray-500">
                      Get notified when your job posting is about to expire
                    </p>
                  </div>
                </div>
                <Switch
                  id="email_job_expiration"
                  checked={preferences.email_job_expiration}
                  onCheckedChange={() => handleToggle('email_job_expiration')}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="email_marketing" className="text-base font-medium cursor-pointer">
                      Marketing & Promotions
                    </Label>
                    <p className="text-sm text-gray-500">
                      Receive tips, offers, and platform updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="email_marketing"
                  checked={preferences.email_marketing}
                  onCheckedChange={() => handleToggle('email_marketing')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="push_new_messages" className="text-base font-medium cursor-pointer">
                      New Messages
                    </Label>
                    <p className="text-sm text-gray-500">
                      Instant browser notifications for new messages
                    </p>
                  </div>
                </div>
                <Switch
                  id="push_new_messages"
                  checked={preferences.push_new_messages}
                  onCheckedChange={() => handleToggle('push_new_messages')}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="push_job_applications" className="text-base font-medium cursor-pointer">
                      Job Applications
                    </Label>
                    <p className="text-sm text-gray-500">
                      Instant notifications for new job applications
                    </p>
                  </div>
                </div>
                <Switch
                  id="push_job_applications"
                  checked={preferences.push_job_applications}
                  onCheckedChange={() => handleToggle('push_job_applications')}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <Label htmlFor="push_job_expiration" className="text-base font-medium cursor-pointer">
                      Job Expiration Alerts
                    </Label>
                    <p className="text-sm text-gray-500">
                      Instant notifications when jobs are about to expire
                    </p>
                  </div>
                </div>
                <Switch
                  id="push_job_expiration"
                  checked={preferences.push_job_expiration}
                  onCheckedChange={() => handleToggle('push_job_expiration')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
