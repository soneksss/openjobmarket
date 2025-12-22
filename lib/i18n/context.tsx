"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Locale } from './config'
import { getDictionary, Dictionary } from './dictionaries'
import Cookies from 'js-cookie'

interface I18nContextType {
  locale: Locale
  dictionary: Dictionary
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({
  children,
  initialLocale = 'en'
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary(initialLocale))

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setDictionary(getDictionary(newLocale))

    // Persist to cookie and localStorage
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    if (typeof window !== 'undefined') {
      localStorage.setItem('NEXT_LOCALE', newLocale)
    }
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = dictionary

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) {
        console.warn(`Translation missing for key: ${key} in locale: ${locale}`)
        return key
      }
    }

    return value as string
  }

  useEffect(() => {
    // Load locale from cookie or localStorage on mount
    const savedLocale = Cookies.get('NEXT_LOCALE') ||
      (typeof window !== 'undefined' ? localStorage.getItem('NEXT_LOCALE') : null)

    if (savedLocale === 'pt-BR' || savedLocale === 'en') {
      setLocaleState(savedLocale)
      setDictionary(getDictionary(savedLocale))
    }
  }, [])

  return (
    <I18nContext.Provider value={{ locale, dictionary, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

export function useTranslation() {
  const { t, locale } = useI18n()
  return { t, locale }
}

export function useLocale() {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale }
}
