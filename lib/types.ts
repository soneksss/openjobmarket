import type { User as SupabaseUser } from '@supabase/supabase-js'

// Extend Supabase User to ensure email is always defined
export interface User extends Omit<SupabaseUser, 'email'> {
  email: string
}

// Helper to safely cast Supabase User to our User type
export function assertUserWithEmail(user: SupabaseUser | null): User | null {
  if (!user || !user.email) return null
  return user as User
}

// Common interfaces used across the app
export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  user_type: 'professional' | 'company' | 'admin'
}

export interface CompanyProfile {
  id: string
  company_name: string
  description: string
  industry: string
  company_size: string
  website_url?: string
  location: string
  logo_url?: string
  user_id: string
}

export interface Job {
  id: string
  title: string
  description: string
  short_description?: string
  work_location: string
  location: string
  budget_min?: number
  budget_max?: number
  skills_required: string[]
  languages?: string[]
  is_active: boolean
  status?: string
  search_state?: string
  urgency_type?: string
  applications_count: number
  views_count: number
  created_at: string
  expires_at?: string
  // Geolocation
  latitude?: number | null
  longitude?: number | null
  // Ownership
  homeowner_id?: string | null
  company_id?: string | null
  poster_company_name?: string | null
  // Feature flags
  is_tradespeople_job?: boolean
  // Nested relations (shape varies by query — keep loose)
  company_profiles?: {
    company_name: string
    location: string
    industry: string
    id?: string
    user_id?: string
    logo_url?: string
    [key: string]: unknown
  }
  homeowner_profiles?: {
    id?: string
    user_id?: string
    first_name?: string
    last_name?: string
    profile_photo_url?: string
    latitude?: number | null
    longitude?: number | null
    latitude_approx?: number | null
    longitude_approx?: number | null
    address_line1?: string
    city?: string
    location?: string
    [key: string]: unknown
  }
}