"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"

export function Footer() {
  const { t, locale } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)

  const getLocalePath = (path: string) => locale === 'pt-BR' ? `/br${path}` : path

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
      } catch {
        // silent fail
      }
    }
    getUser()
  }, [])

  const links = [
    { href: "/site-map",                 label: "Sitemaps" },
    { href: getLocalePath("/about"),     label: t('header.about') },
    { href: getLocalePath("/contact"),   label: t('header.contactUs') },
    { href: getLocalePath("/terms"),     label: t('header.termsConditions') },
    { href: getLocalePath("/privacy"),   label: t('header.privacyPolicy') },
    { href: getLocalePath("/cookies"),   label: t('header.cookiePolicy') },
    { href: getLocalePath("/security"),  label: t('dashboard.security') },
  ]

  return (
    <footer className="border-t border-slate-700 bg-slate-900 py-6 mt-auto pb-28 md:pb-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="text-center text-xs text-slate-500">
          © 2025 Open Job Market Ltd.
        </div>
      </div>
    </footer>
  )
}
