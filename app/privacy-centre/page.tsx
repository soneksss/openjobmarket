import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Eye, Download, Trash2, Bell } from "lucide-react"
import NotificationPreferences from "@/components/notification-preferences"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function PrivacyCentrePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Component now handles user roles internally
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Shield className="h-8 w-8 mr-3 text-primary" />
            Privacy Centre
          </CardTitle>
          <p className="text-muted-foreground">Manage your privacy settings and control how your data is used</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Data Visibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Control who can see your profile and personal information
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Manage Visibility Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Data Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Download a copy of all your data stored with us</p>
                <Button variant="outline" className="w-full bg-transparent">
                  Request Data Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Account Deletion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data
                </p>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Manage your notification preferences below</p>
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  See Below
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Your Rights</h3>
            <p className="text-sm text-muted-foreground">
              You have the right to access, correct, or delete your personal data. You can also object to processing or
              request data portability. Contact us at privacy@openjobmarket.com for assistance.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <NotificationPreferences userId={user.id} />
      </div>
    </div>
  )
}
