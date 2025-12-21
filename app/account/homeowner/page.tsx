import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Bell, Lock, CreditCard, Heart, ChevronLeft } from "lucide-react"

export default async function HomeownerAccountPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get homeowner profile
  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding/homeowner")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/homeowner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account preferences and settings</p>

        <div className="grid gap-6">
          {/* User Profile */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Update your personal information and profile photo</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/homeowner/profile">Manage Profile</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Saved Tradespeople */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Saved Tradespeople
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">View and manage your saved tradespeople and contractors</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/account/homeowner/saved-traders">View Saved Traders</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Manage email and push notification preferences</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/account/homeowner/notifications">Notification Settings</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Manage your password and security settings</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/account/security">Manage Security</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Billing (if applicable) */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">View your billing information and subscription</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/billing">View Billing</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
