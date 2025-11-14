/**
 * Salary conversion utilities for normalizing different salary frequencies
 * Enables accurate filtering regardless of how salaries are posted vs searched
 */

export type SalaryFrequency = 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year'

// Standard working hours/days for calculations
const WORKING_HOURS_PER_DAY = 8
const WORKING_DAYS_PER_WEEK = 5
const WORKING_WEEKS_PER_YEAR = 52
const WORKING_MONTHS_PER_YEAR = 12

const HOURS_PER_YEAR = WORKING_HOURS_PER_DAY * WORKING_DAYS_PER_WEEK * WORKING_WEEKS_PER_YEAR // 2,080
const DAYS_PER_YEAR = WORKING_DAYS_PER_WEEK * WORKING_WEEKS_PER_YEAR // 260
const WEEKS_PER_YEAR = WORKING_WEEKS_PER_YEAR // 52
const MONTHS_PER_YEAR = WORKING_MONTHS_PER_YEAR // 12

/**
 * Convert any salary amount to annual equivalent
 * This is our normalized base for comparisons
 */
export function convertToAnnualSalary(amount: number, frequency: SalaryFrequency): number {
  switch (frequency) {
    case 'per_hour':
      return amount * HOURS_PER_YEAR
    case 'per_day':
      return amount * DAYS_PER_YEAR
    case 'per_week':
      return amount * WEEKS_PER_YEAR
    case 'per_month':
      return amount * MONTHS_PER_YEAR
    case 'per_year':
      return amount
    default:
      return amount // fallback to original amount
  }
}

/**
 * Convert annual salary to any frequency
 * Used for displaying results in user's preferred format
 */
export function convertFromAnnualSalary(annualAmount: number, targetFrequency: SalaryFrequency): number {
  switch (targetFrequency) {
    case 'per_hour':
      return Math.round((annualAmount / HOURS_PER_YEAR) * 100) / 100 // Round to 2 decimal places
    case 'per_day':
      return Math.round((annualAmount / DAYS_PER_YEAR) * 100) / 100
    case 'per_week':
      return Math.round((annualAmount / WEEKS_PER_YEAR) * 100) / 100
    case 'per_month':
      return Math.round((annualAmount / MONTHS_PER_YEAR) * 100) / 100
    case 'per_year':
      return annualAmount
    default:
      return annualAmount
  }
}

/**
 * Convert between any two salary frequencies
 */
export function convertSalary(amount: number, fromFrequency: SalaryFrequency, toFrequency: SalaryFrequency): number {
  if (fromFrequency === toFrequency) {
    return amount
  }

  // Convert to annual, then to target frequency
  const annualAmount = convertToAnnualSalary(amount, fromFrequency)
  return convertFromAnnualSalary(annualAmount, toFrequency)
}

/**
 * Normalize salary range for database filtering
 * Converts user's search criteria to match database salary ranges
 */
export function normalizeSalaryForFiltering(
  searchMinSalary: number,
  searchMaxSalary: number,
  searchFrequency: SalaryFrequency,
  jobMinSalary: number,
  jobMaxSalary: number,
  jobFrequency: SalaryFrequency
): boolean {
  // Convert all salaries to annual for comparison
  const searchMinAnnual = convertToAnnualSalary(searchMinSalary, searchFrequency)
  const searchMaxAnnual = convertToAnnualSalary(searchMaxSalary, searchFrequency)
  const jobMinAnnual = convertToAnnualSalary(jobMinSalary, jobFrequency)
  const jobMaxAnnual = convertToAnnualSalary(jobMaxSalary, jobFrequency)

  // Check if salary ranges overlap
  // Job matches if there's any overlap between search range and job range
  return searchMinAnnual <= jobMaxAnnual && searchMaxAnnual >= jobMinAnnual
}

/**
 * Format salary display with proper frequency
 */
export function formatSalaryDisplay(
  minSalary: number,
  maxSalary: number,
  frequency: SalaryFrequency,
  currency: string = '£'
): string {
  const frequencyDisplay = frequency.replace('_', ' ')

  if (minSalary === maxSalary) {
    return `${currency}${minSalary.toLocaleString()} ${frequencyDisplay}`
  }

  return `${currency}${minSalary.toLocaleString()} - ${currency}${maxSalary.toLocaleString()} ${frequencyDisplay}`
}

/**
 * Get reasonable salary ranges for different frequencies
 * Used for form validation and suggestions
 */
export function getSalaryRangeGuides(frequency: SalaryFrequency) {
  const ranges = {
    per_hour: { min: 10, max: 100, typical: [15, 25, 35, 50] },
    per_day: { min: 80, max: 800, typical: [120, 200, 280, 400] },
    per_week: { min: 400, max: 4000, typical: [600, 1000, 1400, 2000] },
    per_month: { min: 1600, max: 16000, typical: [2400, 4000, 5600, 8000] },
    per_year: { min: 20000, max: 200000, typical: [30000, 50000, 70000, 100000] }
  }

  return ranges[frequency] || ranges.per_year
}

/**
 * Validate if salary amount is reasonable for given frequency
 */
export function isReasonableSalary(amount: number, frequency: SalaryFrequency): boolean {
  const guide = getSalaryRangeGuides(frequency)
  return amount >= guide.min && amount <= guide.max
}

/**
 * Example usage:
 *
 * // User searches for £15/hour minimum
 * const searchMin = 15
 * const searchFreq = 'per_hour'
 *
 * // Job posted as £35,000/year
 * const jobSalary = 35000
 * const jobFreq = 'per_year'
 *
 * // Check if job matches search
 * const annualEquivalent = convertToAnnualSalary(searchMin, searchFreq) // £31,200
 * const matches = annualEquivalent <= jobSalary // true - job pays more than minimum
 */