import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Bell, User, Lock, CreditCard, ArrowLeft } from "lucide-react"
import NotificationPreferences from "@/components/notification-preferences"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            Account Settings
          </CardTitle>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Update your personal information and profile details</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard">Go to Profile</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Manage your password and security settings</p>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Manage your subscription and payment methods</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/billing">View Billing</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Section */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <Bell className="h-6 w-6 mr-3 text-primary" />
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
        </div>
        <NotificationPreferences userId={user.id} />
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Additional Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Privacy Centre</h3>
              <p className="text-sm text-muted-foreground">Manage your privacy settings and data</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/privacy-centre">Manage</Link>
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Language & Region</h3>
              <p className="text-sm text-muted-foreground">Set your preferred language and region</p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Email Preferences</h3>
              <p className="text-sm text-muted-foreground">Manage your email subscription preferences</p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
