// Utility to generate account type labels for dashboard display

export interface UserRoles {
  account_type?: 'individual' | 'company'
  is_jobseeker?: boolean
  is_homeowner?: boolean
  is_employer?: boolean
  is_tradespeople?: boolean
  user_type?: string // Legacy field
}

export function getAccountTypeLabel(roles: UserRoles): {
  type: 'Business' | 'Individual'
  roles: string[]
} {
  const { account_type, is_jobseeker, is_homeowner, is_employer, is_tradespeople, user_type } = roles

  // Determine if Business or Individual
  const isBusinessAccount = account_type === 'company' || user_type === 'company' || user_type === 'employer'

  // Collect role descriptions
  const roleDescriptions: string[] = []

  if (is_employer || user_type === 'employer' || user_type === 'company') {
    // Check if it's a tradesperson business
    if (is_tradespeople) {
      roleDescriptions.push('Self-Employed')
    } else {
      roleDescriptions.push('Company')
    }
  }

  if (is_tradespeople && !is_employer) {
    roleDescriptions.push('Tradesperson')
  }

  // Jobseekers can do everything homeowners can (apply to jobs + post trade jobs)
  // So we only show "Jobseeker" even if is_homeowner is also true
  if (is_jobseeker || user_type === 'professional' || user_type === 'jobseeker') {
    roleDescriptions.push('Jobseeker')
  } else if (is_homeowner || user_type === 'homeowner') {
    // Only show "Homeowner" if they're NOT a jobseeker
    roleDescriptions.push('Homeowner')
  }

  // If no roles identified, use user_type as fallback
  if (roleDescriptions.length === 0 && user_type) {
    if (user_type === 'contractor') {
      roleDescriptions.push('Contractor')
    }
  }

  return {
    type: isBusinessAccount ? 'Business' : 'Individual',
    roles: roleDescriptions
  }
}

export function formatAccountTypeLabel(roles: UserRoles): string {
  const { type, roles: roleList } = getAccountTypeLabel(roles)
  const rolesText = roleList.length > 0 ? roleList.join(', ') : 'User'
  return `${type} - ${rolesText}`
}
