"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Flag,
  MessageSquare,
  Shield,
  User,
  UserX,
  Filter,
  Trash2,
} from "lucide-react"
import { createClient } from "@/lib/client"

interface UserReport {
  id: string
  reporter_id: string
  reported_user_id: string
  message_id?: string
  conversation_id?: string
  report_type: "scam" | "bullying" | "harassment"
  report_reason?: string
  created_at: string
  status: "pending" | "reviewed" | "dismissed" | "action_taken"
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  reporter?: {
    full_name?: string
    nickname?: string
    email?: string
  }
  reported_user?: {
    id: string
    full_name?: string
    nickname?: string
    email?: string
    profile_photo_url?: string
  }
}

interface BlockedUser {
  id: string
  blocker_id: string
  blocked_user_id: string
  blocked_at: string
  blocked_by_admin: boolean
  reason?: string
  is_active: boolean
  blocked_user?: {
    full_name?: string
    nickname?: string
    email?: string
    profile_photo_url?: string
  }
}

interface AdminUser {
  id: string
  email: string
  role: string
}

export function ReportedUsersInterface({ adminUser }: { adminUser: AdminUser }) {
  const [reports, setReports] = useState<UserReport[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<"reports" | "blocked">("reports")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    fetchReports()
    fetchBlockedUsers()
  }, [])

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("user_reports")
        .select(`
          *,
          reporter:users!user_reports_reporter_id_fkey(full_name, nickname, email),
          reported_user:users!user_reports_reported_user_id_fkey(id, full_name, nickname, email, profile_photo_url)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error("Error fetching reports:", error)
    }
  }

  const fetchBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("blocked_users")
        .select(`
          *,
          blocked_user:users!blocked_users_blocked_user_id_fkey(full_name, nickname, email, profile_photo_url)
        `)
        .eq("is_active", true)
        .order("blocked_at", { ascending: false })

      if (error) throw error
      setBlockedUsers(data || [])
    } catch (error) {
      console.error("Error fetching blocked users:", error)
    } finally {
      setLoading(false)
    }
  }

  const getReportIcon = (type: string) => {
    switch (type) {
      case "scam":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "bullying":
        return <Shield className="h-4 w-4 text-orange-500" />
      case "harassment":
        return <MessageSquare className="h-4 w-4 text-purple-500" />
      default:
        return <Flag className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "reviewed":
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><CheckCircle className="h-3 w-3 mr-1" />Reviewed</Badge>
      case "action_taken":
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Action Taken</Badge>
      case "dismissed":
        return <Badge variant="outline" className="text-gray-600 border-gray-300"><Trash2 className="h-3 w-3 mr-1" />Dismissed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleBlockUser = async (userId: string, reason: string) => {
    setProcessingActions(prev => new Set(prev).add(userId))

    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: userId, // Self-block to prevent outgoing
        blocked_user_id: userId, // Block incoming
        blocked_by_admin: true,
        reason: reason,
        admin_id: adminUser.id,
      })

      if (error) throw error

      // Mark all reports for this user as action taken
      await supabase
        .from("user_reports")
        .update({
          status: "action_taken",
          reviewed_by: adminUser.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: `User blocked by admin: ${reason}`,
        })
        .eq("reported_user_id", userId)
        .eq("status", "pending")

      await fetchReports()
      await fetchBlockedUsers()
    } catch (error) {
      console.error("Error blocking user:", error)
      alert("Failed to block user")
    } finally {
      setProcessingActions(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleUnblockUser = async (blockId: string) => {
    setProcessingActions(prev => new Set(prev).add(blockId))

    try {
      const { error } = await supabase
        .from("blocked_users")
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
        })
        .eq("id", blockId)

      if (error) throw error
      await fetchBlockedUsers()
    } catch (error) {
      console.error("Error unblocking user:", error)
      alert("Failed to unblock user")
    } finally {
      setProcessingActions(prev => {
        const next = new Set(prev)
        next.delete(blockId)
        return next
      })
    }
  }

  const handleUpdateReportStatus = async (reportId: string, status: string, notes?: string) => {
    setProcessingActions(prev => new Set(prev).add(reportId))

    try {
      const { error } = await supabase
        .from("user_reports")
        .update({
          status,
          reviewed_by: adminUser.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq("id", reportId)

      if (error) throw error
      await fetchReports()
    } catch (error) {
      console.error("Error updating report:", error)
      alert("Failed to update report")
    } finally {
      setProcessingActions(prev => {
        const next = new Set(prev)
        next.delete(reportId)
        return next
      })
    }
  }

  const getUserReportCount = (userId: string) => {
    return reports.filter(r => r.reported_user_id === userId && r.status === "pending").length
  }

  const filteredReports = reports.filter(report => {
    if (filterStatus !== "all" && report.status !== filterStatus) return false
    if (filterType !== "all" && report.report_type !== filterType) return false
    return true
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading reports...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedTab("reports")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === "reports"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Flag className="h-4 w-4 inline mr-2" />
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setSelectedTab("blocked")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === "blocked"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Ban className="h-4 w-4 inline mr-2" />
          Blocked Users ({blockedUsers.length})
        </button>
      </div>

      {selectedTab === "reports" && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="action_taken">Action Taken</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="scam">Scam</SelectItem>
                    <SelectItem value="bullying">Bullying</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Reported User */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={report.reported_user?.profile_photo_url} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold">
                            {report.reported_user?.full_name || report.reported_user?.nickname || "Unknown User"}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {getReportIcon(report.report_type)}
                            <span className="text-sm font-medium capitalize">{report.report_type}</span>
                          </div>
                          {getStatusBadge(report.status)}
                          <Badge variant="outline" className="text-xs">
                            {getUserReportCount(report.reported_user_id)} total reports
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p><strong>Reported by:</strong> {report.reporter?.full_name || report.reporter?.nickname || "Unknown"}</p>
                          <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                          {report.report_reason && (
                            <p><strong>Reason:</strong> {report.report_reason}</p>
                          )}
                          {report.admin_notes && (
                            <p><strong>Admin notes:</strong> {report.admin_notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {report.status === "pending" && (
                      <div className="flex flex-col space-y-2 min-w-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBlockUser(report.reported_user_id, `Blocked due to ${report.report_type} report`)}
                          disabled={processingActions.has(report.reported_user_id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Block User
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateReportStatus(report.id, "reviewed", "Report reviewed - no action needed")}
                          disabled={processingActions.has(report.id)}
                        >
                          Mark Reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateReportStatus(report.id, "dismissed", "Report dismissed as invalid")}
                          disabled={processingActions.has(report.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredReports.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-gray-500">
                    <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reports found matching your filters.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {selectedTab === "blocked" && (
        <div className="space-y-4">
          {blockedUsers.map((blocked) => (
            <Card key={blocked.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={blocked.blocked_user?.profile_photo_url} />
                      <AvatarFallback>
                        <UserX className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h3 className="font-semibold">
                        {blocked.blocked_user?.full_name || blocked.blocked_user?.nickname || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-600">{blocked.blocked_user?.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={blocked.blocked_by_admin ? "destructive" : "secondary"}>
                          {blocked.blocked_by_admin ? "Admin Blocked" : "User Blocked"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(blocked.blocked_at).toLocaleDateString()}
                        </span>
                      </div>
                      {blocked.reason && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Reason:</strong> {blocked.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleUnblockUser(blocked.id)}
                    disabled={processingActions.has(blocked.id)}
                  >
                    Unblock User
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {blockedUsers.length === 0 && (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-gray-500">
                  <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No blocked users found.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}