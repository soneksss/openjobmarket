// Dictionary loader and exports
import { Locale } from '../config'
import { en, Dictionary } from './en'
import { ptBR } from './pt-BR'

const dictionaries = {
  'en': en,
  'pt-BR': ptBR,
} as const

/**
 * Get dictionary for a specific locale
 * @param locale - The locale
 * @returns The dictionary for that locale
 */
export function getDictionary(locale: Locale): Dictionary {
  return (dictionaries[locale] as Dictionary) || dictionaries.en
}

/**
 * Get a specific translation key
 * @param locale - The locale
 * @param key - Dot-notation key (e.g., 'common.search')
 * @returns The translated string
 */
export function t(locale: Locale, key: string): string {
  const dict = getDictionary(locale)
  const keys = key.split('.')

  let value: any = dict
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key} in locale: ${locale}`)
      return key
    }
  }

  return value as string
}

export { en, ptBR }
export type { Dictionary }
