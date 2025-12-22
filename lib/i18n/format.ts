// Localization formatting utilities
// Handles currency, numbers, and dates for different locales

import { Locale } from './config'

/**
 * Format currency based on locale
 * @param amount - The amount to format
 * @param locale - The locale
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, locale: Locale = 'en'): string {
  if (locale === 'pt-BR') {
    // Brazilian format: R$ 5.000,00
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  // English/Global format: £5,000.00
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

/**
 * Format currency range based on locale
 * @param min - Minimum amount
 * @param max - Maximum amount
 * @param locale - The locale
 * @returns Formatted currency range string
 */
export function formatCurrencyRange(min: number | null, max: number | null, locale: Locale = 'en'): string {
  if (locale === 'pt-BR') {
    if (min && max) {
      return `${formatCurrency(min, locale)} – ${formatCurrency(max, locale)}`
    }
    if (min) {
      return `A partir de ${formatCurrency(min, locale)}`
    }
    if (max) {
      return `Até ${formatCurrency(max, locale)}`
    }
    return ''
  }

  // English format
  if (min && max) {
    return `${formatCurrency(min, locale)} - ${formatCurrency(max, locale)}`
  }
  if (min) {
    return `From ${formatCurrency(min, locale)}`
  }
  if (max) {
    return `Up to ${formatCurrency(max, locale)}`
  }
  return ''
}

/**
 * Format number based on locale
 * @param num - The number to format
 * @param locale - The locale
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: Locale = 'en'): string {
  if (locale === 'pt-BR') {
    // Brazilian format: 5.000,50
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  // English format: 5,000.50
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format date based on locale
 * @param date - The date to format
 * @param locale - The locale
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale: Locale = 'en', includeTime: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (locale === 'pt-BR') {
    // Brazilian format: DD/MM/YYYY or DD/MM/YYYY HH:mm
    if (includeTime) {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj)
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj)
  }

  // English format: DD/MM/YYYY or DD/MM/YYYY, HH:mm
  if (includeTime) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj)
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - The date to format
 * @param locale - The locale
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (locale === 'pt-BR') {
    if (diffInSeconds < 60) return 'Agora mesmo'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} d atrás`
    return formatDate(dateObj, locale)
  }

  // English format
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(dateObj, locale)
}

/**
 * Get currency symbol based on locale
 * @param locale - The locale
 * @returns Currency symbol
 */
export function getCurrencySymbol(locale: Locale = 'en'): string {
  return locale === 'pt-BR' ? 'R$' : '£'
}

/**
 * Get currency code based on locale
 * @param locale - The locale
 * @returns Currency code
 */
export function getCurrencyCode(locale: Locale = 'en'): string {
  return locale === 'pt-BR' ? 'BRL' : 'GBP'
}
