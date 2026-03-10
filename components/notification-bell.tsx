"use client"

import { useState, useEffect } from "react"
import { Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link_url?: string
  is_read: boolean
  created_at: string
}

export function NotificationBell({ iconClassName }: { iconClassName?: string } = {}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('[NOTIFICATION-BELL] No user, skipping realtime subscription')
        setIsLoading(false)
        return
      }

      loadNotifications()

      // Set up real-time subscription for new notifications WITH user filter
      const channel = supabase
        .channel('notifications_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`, // CRITICAL: Filter by user_id
          },
          (payload) => {
            console.log('[NOTIFICATION-BELL] New notification received:', payload)
            loadNotifications()
          }
        )
        .subscribe((status) => {
          console.log('[NOTIFICATION-BELL] Subscription status:', status)
        })

      // Cleanup subscription on unmount
      return () => {
        console.log('[NOTIFICATION-BELL] Cleaning up subscription')
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [])

  const loadNotifications = async () => {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notificationsError) {
        console.error('Error loading notifications:', notificationsError)
        setIsLoading(false)
        return
      }

      setNotifications(notificationsData || [])

      // Count unread
      const unread = (notificationsData || []).filter(n => !n.is_read).length
      setUnreadCount(unread)

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading notifications:', error)
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string, linkUrl?: string) => {
    try {
      const supabase = createClient()

      // Mark as read
      await supabase.rpc('mark_notification_read', { p_notification_id: notificationId })

      // Reload notifications
      await loadNotifications()

      // Navigate if there's a link — strip domain so it always routes locally
      if (linkUrl) {
        try {
          const url = new URL(linkUrl)
          router.push(url.pathname + url.search + url.hash)
        } catch {
          // linkUrl is already a relative path
          router.push(linkUrl)
        }
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      await supabase.rpc('mark_all_notifications_read')
      await loadNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the markAsRead click

    // Optimistic removal from UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    // Update unread count if notification was unread
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting notification:', error)
        await loadNotifications()
      } else {
        console.log('[NOTIFICATION-BELL] Notification deleted:', notificationId)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      await loadNotifications()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return '💬'
      case 'job_application':
        return '📝'
      case 'job_expiring':
        return '⏰'
      case 'job_expired':
        return '❌'
      case 'trade_job_match':
        return '🔧'
      default:
        return '🔔'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) loadNotifications() }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${iconClassName ? "h-auto w-auto p-1" : ""}`}>
          <Bell className={iconClassName ?? "h-5 w-5"} />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[10001]" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full text-left p-4 hover:bg-muted transition-colors group ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id, notification.link_url)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      )}
                      {/* Delete button - always visible */}
                      <div
                        className="p-1.5 rounded-full bg-gray-100 hover:bg-red-100 transition-colors cursor-pointer"
                        onClick={(e) => deleteNotification(notification.id, e)}
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
