import { createClient } from "@/lib/server"
import { createClient as createBrowserClient } from "@/lib/client"

export type AdminRole = "admin" | "super_admin"

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: AdminRole
  is_active: boolean
}

// Server-side admin check
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: adminData } = await supabase
    .from("admin_users")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single()

  if (!adminData) return null

  // Try to get full_name from users table, fallback to admin_users table
  const { data: userData } = await supabase.from("users").select("full_name").eq("id", user.id).single()

  return {
    id: user.id,
    email: user.email!,
    full_name: userData?.full_name || adminData.full_name || null,
    role: adminData.role as AdminRole,
    is_active: true,
  }
}

// Client-side admin check
export async function getAdminUserClient(): Promise<AdminUser | null> {
  const supabase = createBrowserClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: adminData } = await supabase
    .from("admin_users")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single()

  if (!adminData) return null

  // Try to get full_name from users table, fallback to admin_users table
  const { data: userData } = await supabase.from("users").select("full_name").eq("id", user.id).single()

  return {
    id: user.id,
    email: user.email!,
    full_name: userData?.full_name || adminData.full_name || null,
    role: adminData.role as AdminRole,
    is_active: true,
  }
}

// Check if current user has admin privileges
export async function isAdmin(): Promise<boolean> {
  const adminUser = await getAdminUser()
  return adminUser !== null
}

// Check if current user has super admin privileges
export async function isSuperAdmin(): Promise<boolean> {
  const adminUser = await getAdminUser()
  return adminUser?.role === "super_admin"
}
