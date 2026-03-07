// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  ArrowLeft,
  Briefcase,
  MessageCircle,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Star
} from "lucide-react"
import Link from "next/link"

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user type to determine dashboard redirect
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  const userType = userData?.user_type || "homeowner"
  const dashboardPath = userType === "company" ? "/dashboard/company" : `/dashboard/${userType}`

  // Get notifications for this user
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Mark all as read
  if (notifications && notifications.length > 0) {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "job_application":
        return <Users className="h-5 w-5 text-emerald-400" />
      case "message":
        return <MessageCircle className="h-5 w-5 text-blue-400" />
      case "job_accepted":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "job_rejected":
        return <AlertCircle className="h-5 w-5 text-red-400" />
      case "job_expiring":
        return <Clock className="h-5 w-5 text-amber-400" />
      case "review":
        return <Star className="h-5 w-5 text-yellow-400" />
      default:
        return <Bell className="h-5 w-5 text-slate-400" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-slate-900 md:bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-slate-300 hover:text-white md:text-gray-700 md:hover:text-gray-900">
            <Link href={dashboardPath}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card className="bg-slate-800 md:bg-white border-slate-700 md:border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center text-white md:text-gray-900">
              <Bell className="h-6 w-6 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription className="text-slate-400 md:text-gray-600">
              Stay updated on your job activity and messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-slate-500 md:text-gray-400 opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-white md:text-gray-900">No Notifications</h3>
                <p className="text-slate-400 md:text-gray-600">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.is_read
                        ? "bg-slate-800/50 md:bg-gray-50 border-slate-700 md:border-gray-200"
                        : "bg-emerald-900/20 md:bg-blue-50 border-emerald-700/50 md:border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium ${
                              notification.is_read
                                ? "text-slate-300 md:text-gray-700"
                                : "text-white md:text-gray-900"
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-400 md:text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 md:bg-blue-100 md:text-blue-700 md:border-blue-200 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 md:text-gray-500 mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                        {notification.action_url && (
                          <Button
                            variant="link"
                            size="sm"
                            asChild
                            className="mt-2 p-0 h-auto text-emerald-400 md:text-blue-600 hover:text-emerald-300 md:hover:text-blue-700"
                          >
                            <Link href={notification.action_url}>
                              View Details
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings Link */}
        <div className="mt-6 text-center">
          <Button variant="ghost" asChild className="text-slate-400 hover:text-white md:text-gray-500 md:hover:text-gray-900">
            <Link href="/account/settings">
              Manage notification settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
