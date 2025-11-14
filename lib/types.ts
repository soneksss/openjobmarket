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
  requirements: string[]
  responsibilities: string[]
  job_type: string
  experience_level: string
  work_location: string
  location: string
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  benefits: string[]
  is_active: boolean
  applications_count: number
  views_count: number
  created_at: string
  company_profiles?: CompanyProfile
}