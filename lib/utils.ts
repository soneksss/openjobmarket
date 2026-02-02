import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a long address to a short display format: "Street, Postcode, Country"
 * Handles UK, US, and international addresses
 */
export function formatDisplayAddress(fullAddress?: string | null): string {
  if (!fullAddress) return ''

  const parts = fullAddress.split(',').map(p => p.trim())

  // Get the street (first part)
  const street = parts[0]

  // Extract UK postcode using regex (e.g., SW16 5UD, PO9 3AT, etc.)
  const ukPostcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i
  const ukPostcodeMatch = fullAddress.match(ukPostcodeRegex)

  // Extract US ZIP code (5 digits or 5+4)
  const usZipRegex = /\b\d{5}(-\d{4})?\b/
  const usZipMatch = fullAddress.match(usZipRegex)

  const postcode = ukPostcodeMatch?.[0] || usZipMatch?.[0] || null

  // Detect country from address
  let country = ''
  const lowerAddress = fullAddress.toLowerCase()
  if (lowerAddress.includes('united kingdom') || lowerAddress.includes('england') ||
      lowerAddress.includes('scotland') || lowerAddress.includes('wales') ||
      lowerAddress.includes('northern ireland')) {
    country = 'UK'
  } else if (lowerAddress.includes('united states') || lowerAddress.includes('usa')) {
    country = 'US'
  } else if (lowerAddress.includes('germany') || lowerAddress.includes('deutschland')) {
    country = 'DE'
  } else if (lowerAddress.includes('france')) {
    country = 'FR'
  } else if (lowerAddress.includes('spain') || lowerAddress.includes('españa')) {
    country = 'ES'
  } else if (lowerAddress.includes('italy') || lowerAddress.includes('italia')) {
    country = 'IT'
  } else if (lowerAddress.includes('portugal')) {
    country = 'PT'
  } else if (lowerAddress.includes('brazil') || lowerAddress.includes('brasil')) {
    country = 'BR'
  }

  // Build the short address
  const resultParts: string[] = []
  if (street) resultParts.push(street)
  if (postcode) resultParts.push(postcode)
  if (country) resultParts.push(country)

  return resultParts.length > 0 ? resultParts.join(', ') : fullAddress
}
