"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Eye, MessageSquare, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/client"
import { toast } from "@/hooks/use-toast"

interface ProfileVisibilitySettingsProps {
  userId: string
}

export default function ProfileVisibilitySettings({ userId }: ProfileVisibilitySettingsProps) {
  const [profileVisible, setProfileVisible] = useState(true)
  const [allowMessages, setAllowMessages] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [userId])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("profile_visible, allow_messages")
        .eq("id", userId)
        .single()

      if (error) throw error

      if (data) {
        setProfileVisible(data.profile_visible ?? true)
        setAllowMessages(data.allow_messages ?? true)
      }
    } catch (error) {
      console.error("Error fetching visibility settings:", error)
      toast({
        title: "Error",
        description: "Failed to load profile visibility settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (field: "profile_visible" | "allow_messages", value: boolean) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({ [field]: value })
        .eq("id", userId)

      if (error) throw error

      if (field === "profile_visible") {
        setProfileVisible(value)
      } else {
        setAllowMessages(value)
      }

      toast({
        title: "Settings Updated",
        description: "Your profile visibility settings have been saved",
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: "Failed to update settings",
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
            <Eye className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Profile Visibility Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control who can view your profile and contact you
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Visibility Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                <Label htmlFor="profile-visible" className="font-medium cursor-pointer">
                  Public Profile Visibility
                </Label>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                When enabled, other users can view your profile by clicking on your name or picture. When disabled, your profile will be hidden from other users.
              </p>
            </div>
            <Switch
              id="profile-visible"
              checked={profileVisible}
              onCheckedChange={(checked) => updateSetting("profile_visible", checked)}
              disabled={saving}
            />
          </div>

          {/* Allow Messages Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                <Label htmlFor="allow-messages" className="font-medium cursor-pointer">
                  Allow Direct Messages
                </Label>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                When enabled, other users can send you direct messages. When disabled, the message button will be hidden from your profile.
              </p>
            </div>
            <Switch
              id="allow-messages"
              checked={allowMessages}
              onCheckedChange={(checked) => updateSetting("allow_messages", checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Privacy Note</h4>
              <p className="text-sm text-blue-700 mt-1">
                Even when your profile is hidden, your name and basic information may still be visible in job applications, posted jobs, and messages you've sent. These settings only control access to your full public profile page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
