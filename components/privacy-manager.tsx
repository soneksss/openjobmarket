"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Shield, Building, Eye, EyeOff, Trash2, Calendar } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

interface PrivacyPermission {
  id: string
  employer_id: string
  can_see_personal_info: boolean
  granted_at: string
  company_profiles: {
    company_name: string
    industry: string
    logo_url?: string
  }
}

interface PrivacyManagerProps {
  userId: string
}

export default function PrivacyManager({ userId }: PrivacyManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [permissions, setPermissions] = useState<PrivacyPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchPrivacyPermissions()
  }, [userId])

  const fetchPrivacyPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_privacy_permissions")
        .select(`
          *,
          company_profiles!employer_privacy_permissions_employer_id_fkey (
            company_name,
            industry,
            logo_url
          )
        `)
        .eq("professional_id", userId)
        .order("granted_at", { ascending: false })

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error("Error fetching privacy permissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = async (permissionId: string, canSeePersonalInfo: boolean) => {
    setUpdating(permissionId)
    try {
      const { error } = await supabase
        .from("employer_privacy_permissions")
        .update({
          can_see_personal_info: canSeePersonalInfo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", permissionId)

      if (error) throw error

      setPermissions(
        permissions.map((p) => (p.id === permissionId ? { ...p, can_see_personal_info: canSeePersonalInfo } : p)),
      )
    } catch (error) {
      console.error("Error updating permission:", error)
      alert("Failed to update privacy setting")
    } finally {
      setUpdating(null)
    }
  }

  const revokePermission = async (permissionId: string) => {
    setUpdating(permissionId)
    try {
      const { error } = await supabase.from("employer_privacy_permissions").delete().eq("id", permissionId)

      if (error) throw error

      setPermissions(permissions.filter((p) => p.id !== permissionId))
    } catch (error) {
      console.error("Error revoking permission:", error)
      alert("Failed to revoke permission")
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div>Loading privacy settings...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Employer Privacy Permissions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage which employers can see your personal contact information
        </p>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Privacy Permissions Set</h3>
            <p className="text-muted-foreground">
              When you apply to jobs or message employers, you can choose to share your personal information. Those
              permissions will appear here for you to manage.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      <Building className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{permission.company_profiles.company_name}</h4>
                    <p className="text-sm text-muted-foreground">{permission.company_profiles.industry}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Granted {formatDate(permission.granted_at)}
                      </span>
                      <Badge variant={permission.can_see_personal_info ? "default" : "secondary"} className="text-xs">
                        {permission.can_see_personal_info ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Can see personal info
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Limited access
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Share personal info</span>
                    <Switch
                      checked={permission.can_see_personal_info}
                      onCheckedChange={(checked) => updatePermission(permission.id, checked)}
                      disabled={updating === permission.id}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revokePermission(permission.id)}
                    disabled={updating === permission.id}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
