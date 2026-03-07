"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/context"

export function Footer() {
  const { t, locale } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [legalExpanded, setLegalExpanded] = useState(false)
  const [supportExpanded, setSupportExpanded] = useState(false)

  // Helper function to get locale-aware paths
  const getLocalePath = (path: string) => {
    return locale === 'pt-BR' ? `/br${path}` : path
  }

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("user_type")
            .eq("id", user.id)
            .single()
          setUserType(userData?.user_type || null)
        }
      } catch (error) {
        // Silent fail - footer should work even if auth check fails
      }
    }

    getUser()
  }, [])

  // Determine billing link based on user authentication and type
  const getBillingHref = () => {
    if (!user) {
      return "/billing" // Public billing page for non-authenticated users
    }

    if (userType === "company") {
      return "/dashboard/company/subscription"
    } else if (userType === "professional") {
      return "/dashboard/professional/subscription"
    }

    return "/billing" // Fallback to public page
  }

  const legalLinks = [
    { href: getLocalePath("/terms"), label: t('header.termsConditions') },
    { href: getLocalePath("/privacy"), label: t('header.privacyPolicy') },
    { href: getLocalePath("/cookies"), label: t('header.cookiePolicy') },
  ]

  const supportLinks = [
    { href: getLocalePath("/contact"), label: t('header.contactUs') },
    { href: getLocalePath("/security"), label: t('dashboard.security') },
    { href: getBillingHref(), label: user ? t('header.subscriptionBilling') : t('dashboard.billing') },
  ]

  return (
    <footer className="border-t border-slate-700 md:border-border bg-slate-900 md:bg-background py-8 mt-auto pb-28 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Mobile Header and Menu Button — desktop-only equivalent handled in grid below */}
        <div className="hidden md:block mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-foreground">Open Job Market</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('header.connectingTalent')}
          </p>
        </div>

        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-foreground mb-3">Open Job Market</h3>
            <p className="text-sm text-muted-foreground">
              {t('header.connectingTalent')}
            </p>
          </div>

          {/* Legal Links */}
          <div className="text-center">
            <h4 className="font-medium text-foreground mb-3">{t('footer.legal')}</h4>
            <div className="space-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support Links */}
          <div className="text-center md:text-right">
            <h4 className="font-medium text-foreground mb-3">{t('footer.help')}</h4>
            <div className="space-y-2">
              {supportLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright and Quick Links */}
        <div className="border-t border-slate-700 md:border-border pt-6">
          {/* Mobile links row */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3 md:hidden">
            {[
              { href: getLocalePath("/about"),   label: t('header.about') },
              { href: getLocalePath("/contact"),  label: t('header.contactUs') },
              ...legalLinks,
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-500 md:text-muted-foreground">
              © 2025 Open Job Market Ltd.
            </div>
            {/* Desktop quick legal links */}
            <div className="hidden md:flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-2xl md:hidden overflow-y-auto max-h-[70vh] rounded-t-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('common.close')}</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-4">
              {/* Legal - Collapsible */}
              <div className="border-b pb-2">
                <button
                  onClick={() => setLegalExpanded(!legalExpanded)}
                  className="w-full flex items-center justify-between font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{t('footer.legal')}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${legalExpanded ? 'rotate-90' : ''}`} />
                </button>
                {legalExpanded && (
                  <div className="pl-3 mt-2 space-y-2 text-sm">
                    {legalLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-blue-600 hover:text-blue-700 pl-2"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Support - Collapsible */}
              <div className="border-b pb-2">
                <button
                  onClick={() => setSupportExpanded(!supportExpanded)}
                  className="w-full flex items-center justify-between font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{t('footer.help')}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${supportExpanded ? 'rotate-90' : ''}`} />
                </button>
                {supportExpanded && (
                  <div className="pl-3 mt-2 space-y-2 text-sm">
                    {supportLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-blue-600 hover:text-blue-700 pl-2"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </footer>
  )
}
