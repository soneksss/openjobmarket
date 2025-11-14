import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export type AdminRole = "admin" | "super_admin"

export interface AdminUser {
  id: string
  user_id: string
  name: string
  surname: string
  full_name: string | null
  email: string
  country: string
  role: AdminRole
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

/**
 * Get the current admin user information
 * Returns null if user is not an admin
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check user role from users table (role-based approach)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("user_type, full_name, email")
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return null
    }

    // Only return admin user info if user has admin role
    if (userData?.user_type === 'admin') {
      return {
        id: user.id,
        user_id: user.id,
        name: userData.full_name?.split(' ')[0] || 'Admin',
        surname: userData.full_name?.split(' ')[1] || 'User',
        full_name: userData.full_name || null,
        email: userData.email || user.email || '',
        country: 'UK', // TODO: Add country to users table if needed
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
        permissions: {
          can_manage_users: true,
          can_manage_settings: true,
          can_manage_subscriptions: true,
          can_view_analytics: true,
          can_reply_messages: true,
        },
      }
    }

    // Try the database approach for other admin users
    const { data: adminInfo, error } = await supabase
      .rpc('get_admin_user_info', { user_id_param: user.id })

    if (error) {
      console.error('RPC get_admin_user_info error:', error)
      return null
    }

    if (!adminInfo?.is_admin) {
      return null
    }

    return {
      id: adminInfo.user_id,
      user_id: adminInfo.user_id,
      name: adminInfo.name,
      surname: adminInfo.surname,
      full_name: adminInfo.name && adminInfo.surname ? `${adminInfo.name} ${adminInfo.surname}` : null,
      email: user.email || '',
      country: adminInfo.country,
      role: adminInfo.role,
      is_active: true,
      created_at: adminInfo.created_at,
      last_login: adminInfo.last_login,
      permissions: adminInfo.permissions
    }
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

/**
 * Check if the current user is an admin (any type)
 */
export async function isAdmin(): Promise<boolean> {
  const adminUser = await getAdminUser()
  return adminUser !== null
}

/**
 * Check if the current user is a main admin (not support admin)
 */
export async function isMainAdmin(): Promise<boolean> {
  const adminUser = await getAdminUser()
  return adminUser?.role === 'admin'
}

/**
 * Require admin access or redirect to login
 */
export async function requireAdmin(): Promise<AdminUser> {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect('/admin/login')
  }

  return adminUser
}

/**
 * Require main admin access or redirect
 */
export async function requireMainAdmin(): Promise<AdminUser> {
  const adminUser = await requireAdmin()

  if (adminUser.role !== 'admin') {
    redirect('/admin/dashboard?error=insufficient_permissions')
  }

  return adminUser
}

/**
 * Check if admin has specific permission
 */
export function hasPermission(adminUser: AdminUser, permission: keyof AdminUser['permissions']): boolean {
  return adminUser.permissions[permission] === true
}

/**
 * Require specific permission or redirect
 */
export async function requirePermission(permission: keyof AdminUser['permissions']): Promise<AdminUser> {
  const adminUser = await requireAdmin()

  if (!hasPermission(adminUser, permission)) {
    redirect('/admin/dashboard?error=insufficient_permissions')
  }

  return adminUser
}

/**
 * Handle role-based redirects after login
 */
export async function handleAdminLoginRedirect(userId: string): Promise<string> {
  const supabase = await createClient()

  try {
    const { data: adminInfo, error } = await supabase
      .rpc('get_admin_user_info', { user_id_param: userId })

    if (error) {
      console.error('RPC get_admin_user_info error in handleAdminLoginRedirect:', error)
      return '/auth/login?error=server_error'
    }

    if (!adminInfo?.is_admin) {
      // Not an admin user, redirect to regular dashboard or login
      return '/auth/login?error=not_authorized'
    }

    // Update last login timestamp
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userId)

    // Redirect to admin dashboard
    return '/admin/dashboard'
  } catch (error) {
    console.error('Error handling admin login redirect:', error)
    return '/auth/login?error=server_error'
  }
}

/**
 * Get admin navigation items based on permissions
 */
export function getAdminNavItems(adminUser: AdminUser) {
  const baseItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: 'LayoutDashboard',
      available: true
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: 'BarChart3',
      available: hasPermission(adminUser, 'can_view_analytics')
    },
    {
      label: 'Messages',
      href: '/admin/messages',
      icon: 'MessageSquare',
      available: hasPermission(adminUser, 'can_reply_messages')
    }
  ]

  const adminOnlyItems = [
    {
      label: 'Users',
      href: '/admin/users',
      icon: 'Users',
      available: hasPermission(adminUser, 'can_manage_users')
    },
    {
      label: 'Admin Users',
      href: '/admin/admin-users',
      icon: 'Shield',
      available: hasPermission(adminUser, 'can_manage_users')
    },
    {
      label: 'Jobs',
      href: '/admin/jobs',
      icon: 'Briefcase',
      available: hasPermission(adminUser, 'can_manage_settings')
    },
    {
      label: 'Subscriptions',
      href: '/admin/subscriptions',
      icon: 'Crown',
      available: hasPermission(adminUser, 'can_manage_subscriptions')
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: 'Settings',
      available: hasPermission(adminUser, 'can_manage_settings')
    },
    {
      label: 'Payments',
      href: '/admin/payments',
      icon: 'CreditCard',
      available: hasPermission(adminUser, 'can_manage_settings')
    }
  ]

  return [...baseItems, ...adminOnlyItems].filter(item => item.available)
}

// Deprecated functions - kept for compatibility but should not be used
export async function signInAdmin(email: string, password: string) {
  throw new Error("signInAdmin is deprecated. Use regular Supabase auth with admin roles instead.")
}

export async function logoutAdmin() {
  throw new Error("logoutAdmin is deprecated. Use regular Supabase auth signOut instead.")
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: any,
) {
  console.log("[v0] Admin action logged:", {
    adminId,
    action,
    targetType,
    targetId,
    details,
    timestamp: new Date().toISOString(),
  })
}
