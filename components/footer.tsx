"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [legalExpanded, setLegalExpanded] = useState(false)
  const [supportExpanded, setSupportExpanded] = useState(false)

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

  const legalLinks = [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/cookies", label: "Cookie Policy" },
  ]

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

  const supportLinks = [
    { href: "/contact", label: "Contact Us" },
    { href: "/security", label: "Security" },
    { href: getBillingHref(), label: user ? "Subscription & Billing" : "Billing" },
  ]

  return (
    <footer className="border-t bg-background py-8 mt-auto">
      <div className="container mx-auto px-4">
        {/* Mobile Header and Menu Button */}
        <div className="md:hidden mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-foreground">Open Job Market</h3>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting talent with opportunities across the UK and beyond.
          </p>
        </div>

        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-foreground mb-3">Open Job Market</h3>
            <p className="text-sm text-muted-foreground">
              Connecting talent with opportunities across the UK and beyond.
            </p>
          </div>

          {/* Legal Links */}
          <div className="text-center">
            <h4 className="font-medium text-foreground mb-3">Legal</h4>
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
            <h4 className="font-medium text-foreground mb-3">Support</h4>
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
        <div className="border-t pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Open Job Market Ltd. All rights reserved.
            </div>

            {/* Quick Legal Links for mobile/small screens */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground md:hidden">
              {legalLinks.map((link, index) => (
                <span key={link.href}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                  {index < legalLinks.length - 1 && <span className="mx-2">•</span>}
                </span>
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
              <h2 className="text-lg font-semibold">Quick Links</h2>
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
                  <span>Legal</span>
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
                  <span>Support</span>
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
