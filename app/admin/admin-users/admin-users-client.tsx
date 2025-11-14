"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserX,
  CheckCircle,
  AlertTriangle,
  Eye,
  Settings
} from "lucide-react"
import { createClient } from "@/lib/client"
import type { AdminUser } from "@/lib/admin-auth"

interface AdminUserData {
  id: string
  user_id: string
  name: string
  surname: string
  email: string
  country: string
  role: 'admin' | 'support_admin'
  is_active: boolean
  created_at: string
  last_login: string | null
  permissions: {
    can_manage_users: boolean
    can_manage_settings: boolean
    can_manage_subscriptions: boolean
    can_view_analytics: boolean
    can_reply_messages: boolean
  }
}

interface NewAdminUser {
  name: string
  surname: string
  email: string
  country: string
  password: string
  role: 'support_admin'
}

interface AdminUsersClientProps {
  adminUser: AdminUser
}

export default function AdminUsersClient({ adminUser }: AdminUsersClientProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUserData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewUserModal, setShowNewUserModal] = useState(false)

  const [newUser, setNewUser] = useState<NewAdminUser>({
    name: '',
    surname: '',
    email: '',
    country: 'UK',
    password: '',
    role: 'support_admin'
  })

  const supabase = createClient()

  useEffect(() => {
    loadAdminUsers()
  }, [])

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          *,
          user:auth.users(email)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading admin users:', error)
        setError('Failed to load admin users')
      } else {
        // Transform the data to flatten the user email
        const transformedData = data?.map((item: any) => ({
          ...item,
          email: item.user?.email || 'N/A'
        })) || []
        setAdminUsers(transformedData as any)
      }
    } catch (err) {
      console.error('Exception loading admin users:', err)
      setError('Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSupportUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name || !newUser.surname) {
      setError('All fields are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // First, create the auth user using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          name: newUser.name,
          surname: newUser.surname,
          country: newUser.country
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        setError(`Failed to create user account: ${authError.message}`)
        return
      }

      if (!authData.user) {
        setError('Failed to create user account')
        return
      }

      // Then create the admin record
      const { data: adminResult, error: adminError } = await supabase
        .rpc('add_admin_record', {
          p_user_id: authData.user.id,
          p_name: newUser.name,
          p_surname: newUser.surname,
          p_country: newUser.country,
          p_role: newUser.role
        })

      if (adminError) {
        console.error('Error creating admin record:', adminError)
        setError(`Failed to create admin record: ${adminError.message}`)

        // Try to clean up the auth user if admin record creation failed
        await supabase.auth.admin.deleteUser(authData.user.id)
        return
      }

      if (!adminResult.success) {
        setError(adminResult.error || 'Failed to create admin record')

        // Clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        return
      }

      // Reset form and reload users
      setNewUser({
        name: '',
        surname: '',
        email: '',
        country: 'UK',
        password: '',
        role: 'support_admin'
      })
      setShowNewUserModal(false)
      await loadAdminUsers()

    } catch (err) {
      console.error('Exception creating support user:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: false })
        .eq('user_id', userId)

      if (error) {
        console.error('Error deactivating user:', error)
        setError('Failed to deactivate user')
        return
      }

      await loadAdminUsers()
    } catch (err) {
      console.error('Exception deactivating user:', err)
      setError('Failed to deactivate user')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'support_admin':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canManageUsers = adminUser.permissions.can_manage_users

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-muted-foreground animate-spin" />
          <div>
            <h1 className="text-3xl font-bold">Admin Users</h1>
            <p className="text-muted-foreground">Loading admin users...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Admin Users</h1>
            <p className="text-muted-foreground">Manage admin and support users</p>
          </div>
        </div>

        {canManageUsers && (
          <Button onClick={() => setShowNewUserModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Support User
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Admin Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <UserCheck className="h-5 w-5" />
            <span>Your Account</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-600">Name</p>
              <p className="font-medium text-blue-800">{adminUser.name} {adminUser.surname}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Role</p>
              <Badge className={getRoleColor(adminUser.role)}>
                {adminUser.role === 'admin' ? 'Main Admin' : 'Support Admin'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Admin & Support Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.map((user) => (
              <Card key={user.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div>
                          <h3 className="font-semibold">{user.name} {user.surname}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role === 'admin' ? 'Main Admin' : 'Support Admin'}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Country</p>
                          <p>{user.country}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p>{formatDate(user.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Login</p>
                          <p>{user.last_login ? formatDate(user.last_login) : 'Never'}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-2">Permissions:</p>
                        <div className="flex flex-wrap gap-2">
                          {user.permissions.can_view_analytics && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              View Analytics
                            </Badge>
                          )}
                          {user.permissions.can_reply_messages && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reply Messages
                            </Badge>
                          )}
                          {user.permissions.can_manage_settings && (
                            <Badge variant="outline" className="text-xs">
                              <Settings className="w-3 h-3 mr-1" />
                              Manage Settings
                            </Badge>
                          )}
                          {user.permissions.can_manage_users && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Manage Users
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {canManageUsers && user.role === 'support_admin' && (
                      <div className="ml-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <UserX className="w-4 h-4 mr-1" />
                              Deactivate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Support User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {user.name} {user.surname}?
                                They will lose access to the admin dashboard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeactivateUser(user.user_id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {adminUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Admin Users</h3>
                <p className="text-muted-foreground">No admin users found in the system.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Support User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add Support User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={newUser.surname}
                    onChange={(e) => setNewUser({...newUser, surname: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Strong password"
                />
              </div>

              <div>
                <Label>Country</Label>
                <Select
                  value={newUser.country}
                  onValueChange={(value) => setNewUser({...newUser, country: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Support User Permissions:</strong> Can view analytics and reply to messages,
                  but cannot manage settings, users, or subscriptions.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewUserModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSupportUser}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Creating..." : "Create Support User"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}