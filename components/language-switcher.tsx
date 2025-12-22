"use client"

import { useLocale } from '@/lib/i18n/context'
import { Globe } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', route: '' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', route: 'br' },
] as const

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const currentLanguage = languages.find(lang => lang.code === locale)

  const handleLanguageChange = (newLocale: 'en' | 'pt-BR', route: string) => {
    // Update the locale in context (which also updates cookies/localStorage)
    setLocale(newLocale)

    // Navigate to the appropriate route
    let newPath = pathname

    // Remove current locale prefix if exists
    if (pathname.startsWith('/br')) {
      newPath = pathname.replace(/^\/br/, '') || '/'
    }

    // Add new locale prefix if needed
    if (route) {
      newPath = `/${route}${newPath === '/' ? '' : newPath}`
    }

    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage?.flag}</span>
          <span className="hidden md:inline">{currentLanguage?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code, lang.route)}
            className={locale === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
