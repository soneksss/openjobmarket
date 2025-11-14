import { Suspense } from "react"
import { MessagesInterface } from "@/components/messages-interface"
import { getAdminUser } from "@/lib/admin-auth"
import { Card, CardContent } from "@/components/ui/card"

function MessagesSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      <Card className="lg:col-span-1">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <div className="h-[500px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AdminMessagesPage() {
  const adminUser = await getAdminUser()

  // In a real app, this would check the admin settings from database
  const canSendMessages = true // This would be based on admin settings

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Management</h1>
        <p className="text-muted-foreground">Monitor and manage conversations between users</p>
      </div>

      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesInterface adminRole={adminUser?.role || "admin2"} canSendMessages={canSendMessages} />
      </Suspense>
    </div>
  )
}
