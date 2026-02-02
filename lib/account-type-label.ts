// Utility to generate account type labels for dashboard display

export interface UserRoles {
  account_type?: 'individual' | 'business'
  user_type?: string // professional, company, homeowner, contractor
}

export function getAccountTypeLabel(roles: UserRoles): {
  type: 'Business' | 'Individual'
  description: string
} {
  const { account_type, user_type } = roles

  // Business accounts
  if (account_type === 'business' || user_type === 'company' || user_type === 'contractor') {
    return {
      type: 'Business',
      description: 'Can post jobs, offer services, and hire staff'
    }
  }

  // Individual accounts
  return {
    type: 'Individual',
    description: 'Can find jobs and hire tradespeople'
  }
}

export function formatAccountTypeLabel(roles: UserRoles): string {
  const { type } = getAccountTypeLabel(roles)
  return `${type} Account`
}

export function getAccountTypeBadgeColor(accountType: 'individual' | 'business' | undefined): string {
  if (accountType === 'business') {
    return 'bg-orange-100 text-orange-800'
  }
  return 'bg-blue-100 text-blue-800'
}
