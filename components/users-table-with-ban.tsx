"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Search, Mail, MapPin, Calendar, Building, Ban, ShieldOff, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdminUser {
  id: string
  email: string
  full_name: string
  user_type: "professional" | "company" | "jobseeker" | "employer" | "contractor" | "homeowner" | "admin"
  created_at: string
  profile_photo_url?: string
  location?: string
  is_banned?: boolean
  ban_reason?: string
  banned_at?: string
  ban_expires_at?: string
  // Multi-role system
  account_type?: "individual" | "company"
  is_jobseeker?: boolean
  is_homeowner?: boolean
  is_employer?: boolean
  is_tradespeople?: boolean
  // Professional specific fields
  first_name?: string
  last_name?: string
  title?: string
  available_for_work?: boolean
  bio?: string
  // Company specific fields
  company_name?: string
  industry?: string
  company_size?: string
  website_url?: string
  description?: string
}

interface UsersTableProps {
  userType: "professional" | "company"
  adminRole: string
}

export function UsersTableWithBan({ userType, adminRole }: UsersTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")
  const [banDuration, setBanDuration] = useState<string>("permanent")
  const [isBanning, setIsBanning] = useState(false)
  const { toast } = useToast()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchUsers()
  }, [userType])

  useEffect(() => {
    const filtered = users.filter((user) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        user.email?.toLowerCase().includes(searchLower) ||
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.company_name?.toLowerCase().includes(searchLower) ||
        user.title?.toLowerCase().includes(searchLower) ||
        user.industry?.toLowerCase().includes(searchLower)
      )
    })
    setFilteredUsers(filtered)
  }, [users, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching users for type:", userType)

      if (userType === "professional") {
        const { data: profilesData, error: profilesError } = await supabase
          .from("professional_profiles")
          .select(`
            user_id,
            first_name,
            last_name,
            title,
            available_for_work,
            bio,
            location,
            created_at
          `)
          .order("created_at", { ascending: false })

        if (profilesError || !profilesData) {
          setUsers([])
          return
        }

        const userIds = profilesData.map(profile => profile.user_id)
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, user_type, is_banned, ban_reason, banned_at, ban_expires_at, account_type, is_jobseeker, is_homeowner, is_employer, is_tradespeople")
          .in("id", userIds)

        if (usersError) {
          console.error("Error fetching user ban data:", usersError)
        }

        console.log("Fetched users with ban data:", usersData)

        const userDataMap = new Map()
        usersData?.forEach(user => {
          userDataMap.set(user.id, user)
        })

        const processedUsers = profilesData.map((profile: any) => {
          const userData = userDataMap.get(profile.user_id) || {}
          return {
            id: profile.user_id,
            email: userData.email || 'No email available',
            full_name: `${profile.first_name} ${profile.last_name}`,
            user_type: userData.user_type || "professional" as const,
            created_at: profile.created_at,
            first_name: profile.first_name,
            last_name: profile.last_name,
            title: profile.title,
            available_for_work: profile.available_for_work,
            location: profile.location,
            is_banned: userData.is_banned || false,
            ban_reason: userData.ban_reason,
            banned_at: userData.banned_at,
            ban_expires_at: userData.ban_expires_at,
            account_type: userData.account_type,
            is_jobseeker: userData.is_jobseeker || false,
            is_homeowner: userData.is_homeowner || false,
            is_employer: userData.is_employer || false,
            is_tradespeople: userData.is_tradespeople || false
          }
        })

        console.log("Processed professional users:", processedUsers)
        console.log("Banned users count:", processedUsers.filter(u => u.is_banned).length)
        console.log("ROLES DEBUG - First user roles:", processedUsers[0] ? {
          is_jobseeker: processedUsers[0].is_jobseeker,
          is_homeowner: processedUsers[0].is_homeowner,
          is_employer: processedUsers[0].is_employer,
          is_tradespeople: processedUsers[0].is_tradespeople,
          account_type: processedUsers[0].account_type
        } : 'No users')

        setUsers(processedUsers)
        setTotalCount(processedUsers.length)
      } else {
        const { data: profilesData, error: profilesError } = await supabase
          .from("company_profiles")
          .select(`
            user_id,
            company_name,
            industry,
            company_size,
            website_url,
            description,
            location,
            created_at
          `)
          .order("created_at", { ascending: false })

        if (profilesError || !profilesData) {
          setUsers([])
          return
        }

        const userIds = profilesData.map(profile => profile.user_id)
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, user_type, is_banned, ban_reason, banned_at, ban_expires_at, account_type, is_jobseeker, is_homeowner, is_employer, is_tradespeople")
          .in("id", userIds)

        if (usersError) {
          console.error("Error fetching user ban data:", usersError)
        }

        console.log("Fetched users with ban data:", usersData)

        const userDataMap = new Map()
        usersData?.forEach(user => {
          userDataMap.set(user.id, user)
        })

        const processedUsers = profilesData.map((profile: any) => {
          const userData = userDataMap.get(profile.user_id) || {}
          return {
            id: profile.user_id,
            email: userData.email || 'No email available',
            full_name: profile.company_name,
            user_type: userData.user_type || "company" as const,
            created_at: profile.created_at,
            company_name: profile.company_name,
            industry: profile.industry,
            company_size: profile.company_size,
            website_url: profile.website_url,
            location: profile.location,
            is_banned: userData.is_banned || false,
            ban_reason: userData.ban_reason,
            banned_at: userData.banned_at,
            ban_expires_at: userData.ban_expires_at,
            account_type: userData.account_type,
            is_jobseeker: userData.is_jobseeker || false,
            is_homeowner: userData.is_homeowner || false,
            is_employer: userData.is_employer || false,
            is_tradespeople: userData.is_tradespeople || false
          }
        })

        console.log("Processed company users:", processedUsers)
        console.log("Banned users count:", processedUsers.filter(u => u.is_banned).length)

        setUsers(processedUsers)
        setTotalCount(processedUsers.length)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a ban reason",
        variant: "destructive"
      })
      return
    }

    setIsBanning(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      let banExpiresAt = null
      if (banDuration !== "permanent") {
        const now = new Date()
        const days = parseInt(banDuration)
        banExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          is_banned: true,
          ban_reason: banReason,
          banned_at: new Date().toISOString(),
          banned_by: currentUser?.id,
          ban_expires_at: banExpiresAt
        })
        .eq("id", selectedUser.id)
        .select()

      if (error) {
        console.error("Ban error:", error)
        throw error
      }

      console.log("User banned successfully:", data)

      toast({
        title: "User banned",
        description: `${selectedUser.full_name} has been banned successfully`
      })

      setShowBanDialog(false)
      setBanReason("")
      setBanDuration("permanent")
      setSelectedUser(null)

      // Refresh the list after a short delay to ensure DB update is propagated
      setTimeout(() => {
        fetchUsers()
      }, 500)
    } catch (error) {
      console.error("Error banning user:", error)
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      })
    } finally {
      setIsBanning(false)
    }
  }

  const handleUnbanUser = async (user: AdminUser) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          is_banned: false,
          ban_reason: null,
          ban_expires_at: null,
          banned_at: null,
          banned_by: null
        })
        .eq("id", user.id)
        .select()

      if (error) {
        console.error("Unban error:", error)
        throw error
      }

      console.log("User unbanned successfully:", data)

      toast({
        title: "User unbanned",
        description: `${user.full_name} has been unbanned successfully`
      })

      // Refresh the list after a short delay
      setTimeout(() => {
        fetchUsers()
      }, 500)
    } catch (error) {
      console.error("Error unbanning user:", error)
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getInitials = (user: AdminUser) => {
    if (userType === "professional") {
      return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    } else {
      return user.company_name?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || "C"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {userType === "professional" ? "Professional Users" : "Company Users"}
          </CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {userType === "professional" ? "Professional Users" : "Company Users"}
            <Badge variant="secondary">{totalCount !== null ? totalCount : "Loading..."}</Badge>
          </CardTitle>
          <CardDescription>Manage {userType} accounts and view user information</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${userType}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  {userType === "professional" ? (
                    <>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Industry</TableHead>
                      <TableHead>Size</TableHead>
                    </>
                  )}
                  <TableHead>Location</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No {userType}s found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.is_banned ? "bg-red-50" : ""}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile_photo_url || "/placeholder.svg"} />
                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {userType === "professional"
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.full_name
                                : user.company_name || user.full_name}
                              {user.is_banned && (
                                <Badge variant="destructive" className="text-xs">
                                  <Ban className="h-3 w-3 mr-1" />
                                  BANNED
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.user_type === "admin" && (
                            <Badge variant="default" className="text-xs bg-purple-600">Admin</Badge>
                          )}
                          {user.is_jobseeker && (
                            <Badge variant="secondary" className="text-xs">Jobseeker</Badge>
                          )}
                          {user.is_homeowner && (
                            <Badge variant="outline" className="text-xs">Homeowner</Badge>
                          )}
                          {user.is_employer && (
                            <Badge variant="default" className="text-xs bg-blue-600">Employer</Badge>
                          )}
                          {user.is_tradespeople && (
                            <Badge variant="default" className="text-xs bg-orange-600">Tradespeople</Badge>
                          )}
                          {!user.is_jobseeker && !user.is_homeowner && !user.is_employer && !user.is_tradespeople && user.user_type !== "admin" && (
                            <Badge variant="secondary" className="text-xs text-gray-500">No roles</Badge>
                          )}
                        </div>
                      </TableCell>
                      {userType === "professional" ? (
                        <>
                          <TableCell>
                            <span className="text-sm">{user.title || "Not specified"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.available_for_work ? "default" : "secondary"}>
                              {user.available_for_work ? "Available" : "Not Available"}
                            </Badge>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <span className="text-sm">{user.industry || "Not specified"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{user.company_size || "Not specified"}</span>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{user.location || "Not specified"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{formatDate(user.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          {user.is_banned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnbanUser(user)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setShowBanDialog(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Ban
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              You are about to ban {selectedUser?.full_name}. This action can be reversed later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ban Duration</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Ban *</label>
              <Textarea
                placeholder="Enter the reason for banning this user (e.g., violation of terms, spam, inappropriate behavior)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBanDialog(false)
                setBanReason("")
                setBanDuration("permanent")
                setSelectedUser(null)
              }}
              disabled={isBanning}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={isBanning || !banReason.trim()}
            >
              {isBanning ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
