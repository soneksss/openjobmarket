"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Mail, MapPin, Calendar, Building } from "lucide-react"

interface AdminUser {
  id: string
  email: string
  full_name: string
  user_type: "professional" | "company"
  created_at: string
  profile_photo_url?: string
  location?: string
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

export function UsersTable({ userType, adminRole }: UsersTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)

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
        console.log("[v0] Starting professional users query...")

        // First, try to get all professional profiles
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

        console.log("[v0] Professional profiles query result:", {
          profilesData,
          profilesError,
          count: profilesData?.length || 0
        })

        if (profilesError) {
          console.error("Error fetching professional profiles:", profilesError)
          setUsers([])
          return
        }

        if (!profilesData || profilesData.length === 0) {
          console.log("[v0] No professional profiles found")
          setUsers([])
          return
        }

        // Get user emails separately
        const userIds = profilesData.map(profile => profile.user_id)
        console.log("[v0] Fetching user emails for IDs:", userIds)

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, user_type")
          .in("id", userIds)

        console.log("[v0] Users query result:", {
          usersData,
          usersError,
          count: usersData?.length || 0
        })

        // Create a map of user ID to email for quick lookup
        const userEmailMap = new Map()
        if (usersData) {
          usersData.forEach(user => {
            userEmailMap.set(user.id, user.email)
          })
        }

        const processedUsers = profilesData.map((profile: any) => ({
          id: profile.user_id,
          email: userEmailMap.get(profile.user_id) || 'No email available',
          full_name: `${profile.first_name} ${profile.last_name}`,
          user_type: "professional" as const,
          created_at: profile.created_at,
          first_name: profile.first_name,
          last_name: profile.last_name,
          title: profile.title,
          available_for_work: profile.available_for_work,
          location: profile.location,
        }))

        console.log("[v0] Final processed professional users:", processedUsers)
        setUsers(processedUsers)
        setTotalCount(processedUsers.length)
      } else {
        console.log("[v0] Starting company users query...")

        // First, get all company profiles
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

        console.log("[v0] Company profiles query result:", {
          profilesData,
          profilesError,
          count: profilesData?.length || 0
        })

        if (profilesError) {
          console.error("Error fetching company profiles:", profilesError)
          setUsers([])
          return
        }

        if (!profilesData || profilesData.length === 0) {
          console.log("[v0] No company profiles found")
          setUsers([])
          return
        }

        // Get user emails separately
        const userIds = profilesData.map(profile => profile.user_id)
        console.log("[v0] Fetching user emails for company IDs:", userIds)

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, user_type")
          .in("id", userIds)

        console.log("[v0] Company users query result:", {
          usersData,
          usersError,
          count: usersData?.length || 0
        })

        // Create a map of user ID to email for quick lookup
        const userEmailMap = new Map()
        if (usersData) {
          usersData.forEach(user => {
            userEmailMap.set(user.id, user.email)
          })
        }

        const processedUsers = profilesData.map((profile: any) => ({
          id: profile.user_id,
          email: userEmailMap.get(profile.user_id) || 'No email available',
          full_name: profile.company_name,
          user_type: "company" as const,
          created_at: profile.created_at,
          company_name: profile.company_name,
          industry: profile.industry,
          company_size: profile.company_size,
          website_url: profile.website_url,
          location: profile.location,
        }))

        console.log("[v0] Final processed company users:", processedUsers)
        setUsers(processedUsers)
        setTotalCount(processedUsers.length)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
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
            {userType === "professional" ? <Building className="h-5 w-5" /> : <Building className="h-5 w-5" />}
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {userType === "professional" ? <Building className="h-5 w-5" /> : <Building className="h-5 w-5" />}
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No {userType}s found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_photo_url || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {userType === "professional"
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.full_name
                              : user.company_name || user.full_name}
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
                        {adminRole === "admin1" && (
                          <Button variant="outline" size="sm">
                            Edit
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
  )
}
