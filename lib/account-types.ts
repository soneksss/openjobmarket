/**
 * Account Types - Single source of truth for user account classification
 *
 * - 'individual': Job seekers, professionals looking for employment
 * - 'business': Self-employed, tradespeople, companies, contractors
 */

export type AccountType = 'individual' | 'business'

export interface AccountTypePermissions {
  canApplyToTradeJobs: boolean
  canPostVacancies: boolean
  canPostTradeJobs: boolean
  canHireProfessionals: boolean
  profileTable: 'company_profiles' | 'homeowner_profiles'
}

/**
 * Get permissions for an account type
 */
export function getAccountPermissions(
  accountType: AccountType,
  userType?: string
): AccountTypePermissions {
  if (accountType === 'business') {
    return {
      canApplyToTradeJobs: true,
      canPostVacancies: true,
      canPostTradeJobs: true,
      canHireProfessionals: true,
      profileTable: 'company_profiles'
    }
  }

  // Individual / homeowner account
  return {
    canApplyToTradeJobs: false,
    canPostVacancies: false,
    canPostTradeJobs: false,
    canHireProfessionals: true,
    profileTable: 'homeowner_profiles'
  }
}

/**
 * Determine account type from legacy flags
 * Used for backward compatibility during migration
 */
export function determineAccountTypeFromFlags(flags: {
  is_tradespeople?: boolean
  is_self_employed?: boolean
  user_type?: string
}): AccountType {
  // Business if tradespeople or self-employed
  if (flags.is_tradespeople || flags.is_self_employed) {
    return 'business'
  }

  // Business if company
  if (flags.user_type === 'company') {
    return 'business'
  }

  // Default to individual
  return 'individual'
}

/**
 * Check if a user can apply to a specific job
 */
export function canApplyToJob(
  accountType: AccountType,
  isTradeJob: boolean
): boolean {
  // Trade jobs require business account
  if (isTradeJob) {
    return accountType === 'business'
  }

  // Regular jobs - anyone can apply
  return true
}

/**
 * Check if a user can post a vacancy/job
 */
export function canPostJob(
  accountType: AccountType,
  userType: string,
  isTradeJob: boolean
): boolean {
  // Trade jobs require business account
  if (isTradeJob) {
    return accountType === 'business'
  }

  // Regular vacancies - companies and homeowners can post
  return userType === 'company' || userType === 'homeowner'
}

/**
 * Get display label for account type
 */
export function getAccountTypeLabel(accountType: AccountType): string {
  return accountType === 'business' ? 'Business Account' : 'Individual Account'
}

/**
 * Get description for account type
 */
export function getAccountTypeDescription(accountType: AccountType): string {
  if (accountType === 'business') {
    return 'For tradespeople, self-employed professionals, and companies offering services'
  }
  return 'For job seekers and professionals looking for employment opportunities'
}
