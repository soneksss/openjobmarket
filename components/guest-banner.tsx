"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface GuestBannerProps {
  onSignUp?: () => void
  hideOnSearch?: boolean
}

export function GuestBanner({ onSignUp, hideOnSearch = false }: GuestBannerProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Listen for search events
  useEffect(() => {
    if (!hideOnSearch) return

    const handleSearchEvent = () => {
      setHasSearched(true)
    }

    // Listen for custom search event
    window.addEventListener('mainPageSearch', handleSearchEvent)

    return () => {
      window.removeEventListener('mainPageSearch', handleSearchEvent)
    }
  }, [hideOnSearch])

  if (isDismissed || (hideOnSearch && hasSearched)) return null

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp()
    } else {
      // Preserve locale when redirecting to sign-up
      const isOnBrRoute = pathname?.startsWith('/br')
      const signUpUrl = isOnBrRoute ? '/br/auth/sign-up' : '/auth/sign-up'
      router.push(signUpUrl)
    }
  }

  return (
    <div className="bg-blue-600 text-white py-2 px-4 text-center text-sm relative">
      <span className="font-medium">{t('guestBanner.browsing')}</span>
      {" "}
      <button
        onClick={handleSignUp}
        className="underline hover:text-blue-100 font-semibold"
      >
        {t('guestBanner.signUpFree')}
      </button>
      {" "}{t('guestBanner.toSendMessages')}

      {/* Close button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
