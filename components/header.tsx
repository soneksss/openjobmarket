"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Building2, LogOut, Settings, FileText, Briefcase, ChevronDown, BookmarkIcon, RefreshCw, Shield, CreditCard, X, BarChart3, Menu, ChevronRight, Home, Globe, HelpCircle, Info } from "lucide-react"
import { MessageIcon } from "@/components/message-icon"
import { NotificationBell } from "@/components/notification-bell"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"
import { manualLogout } from "@/hooks/use-auto-logout"
import { useEffect, useState } from "react"
import { signOut } from "@/lib/actions"
import { OnboardingFlow } from "./onboarding/OnboardingFlow"
import { useLanguageRegion } from "@/contexts/language-region-context"
import { getDisplayText } from "@/lib/i18n/language-region"
import { useTranslation } from "@/lib/i18n/context"

interface HeaderProps {
  user?: any
  userType?: "professional" | "company"
  showAuth?: boolean
  onSignOut?: () => void
  profilePhotoUrl?: string
  showProfessionalsPageButtons?: boolean
  isModal?: boolean
  onModalClose?: () => void
  /** When true: black background, logo centred, nav/auth on sides */
  dark?: boolean
}

export function Header({ user, userType, showAuth = true, onSignOut, profilePhotoUrl, showProfessionalsPageButtons = false, isModal = false, onModalClose, dark = false }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, locale } = useTranslation()
  const [clientUser, setClientUser] = useState(user)
  const [clientUserType, setClientUserType] = useState(userType)
  const [isLoading, setIsLoading] = useState(false) // Don't show loading by default
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Language & Region context
  const { state: languageRegionState, openModal: openLanguageModal } = useLanguageRegion()

  // Detect if user is on Portuguese version using both i18n context and pathname (most reliable)
  const isOnBrRoute = locale === 'pt-BR' || pathname?.startsWith('/br')

  const signUpUrl = isOnBrRoute
    ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/sign-up'
  const loginUrl = isOnBrRoute
    ? `/auth/login?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/login'

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  // Prevent hydration mismatch by only showing language text after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient()

    // If we have a server user, check if they're an admin
    if (user) {
      const checkAdminStatus = async () => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', user.id)
            .single()

          setIsAdmin(userData?.user_type === 'admin')
        } catch (err) {
          console.error('[HEADER] Failed to check admin status:', err)
        }
      }
      checkAdminStatus()
      return
    }

    // Initial auth check - only if no server user
    const checkAuth = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()

        if (error) {
          setClientUser(null)
          setClientUserType(undefined)
          return
        }

        if (authUser) {
          // Fetch user type
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', authUser.id)
            .single()

          setClientUser(authUser)
          setClientUserType(userData?.user_type as "professional" | "company")
          setIsAdmin(userData?.user_type === 'admin')
        } else {
          setClientUser(null)
          setClientUserType(undefined)
        }
      } catch (err) {
        console.error('[HEADER] Auth check failed:', err)
      }
    }

    if (!user) {
      checkAuth()
    }

    // Listen for auth state changes (only if no server user)
    if (!user) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // User just signed in
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', session.user.id)
            .single()

          setClientUser(session.user)
          setClientUserType(userData?.user_type as "professional" | "company")
          setIsAdmin(userData?.user_type === 'admin')
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setClientUser(null)
          setClientUserType(undefined)
          setIsAdmin(false)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user]) // Re-run if user prop changes

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        onSignOut()
      } else {
        // Clear storage first
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }

        // Use server-side sign out action which will redirect
        await signOut()
      }
    } catch (error) {
      console.error('[HEADER] Sign out error:', error)
      // Force redirect even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  // Prioritize server user state, fall back to client user
  const currentUser = user || clientUser
  const currentUserType = userType || clientUserType

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const supabase = createClient()
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser()

      if (error) {
        // Handle session errors in manual refresh
        if (!(error.message === 'Auth session missing!' ||
            error.message === 'Invalid JWT' ||
            error.message.includes('AuthSessionMissingError'))) {
          console.error('[HEADER] Manual refresh error:', error)
        }
        setClientUser(null)
        setClientUserType(undefined)
        return
      }

      if (refreshedUser) {
        setClientUser(refreshedUser)

        // Get user type
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", refreshedUser.id)
          .single()

        if (!userError && userData) {
          setClientUserType(userData.user_type)
        }
      }
    } catch (error) {
      console.error('[HEADER] Manual refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // ─── Logo click handler (shared) ─────────────────────────────────────────
  const handleLogoClick = () => {
    if (isModal && onModalClose) { onModalClose(); return }
    const targetUrl = getLocalePath("/")
    if (pathname === targetUrl) return
    router.push(targetUrl)
  }

  const logoEl = (
    <div
      onClick={handleLogoClick}
      className="flex items-center gap-2 cursor-pointer hover:opacity-90 hover:scale-[1.03] transition-all duration-200"
    >
      <div className="rounded-xl overflow-hidden flex-shrink-0">
        <Image
          src="/Logo.png"
          alt="Open Job Market"
          width={40}
          height={40}
          className="h-9 w-9 block"
          priority
        />
      </div>
      <span className={`font-semibold text-sm sm:text-base leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
        Open Job Market
      </span>
    </div>
  )

  // ─── Header: dark slate bg on mobile home page, default everywhere else ─────
  return (
    <header className={`${dark ? "bg-slate-900 border-b border-slate-700/50" : "bg-background border-b"}`}>
      <div className="container mx-auto px-2 py-1">

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {logoEl}

            {/* Help Icon Dropdown - Mobile only */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className={`p-2 ${dark ? "text-slate-200 hover:text-white hover:bg-white/10" : ""}`}>
                    <HelpCircle className="h-9 w-9" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[100]">
                  <DropdownMenuItem asChild>
                    <Link href={getLocalePath("/about")} className="flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      {t('header.about')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={getLocalePath("/help")} className="flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      {t('header.help')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <nav className="hidden md:flex items-center space-x-2">
              <Link href={getLocalePath("/about")}>
                <Button variant="ghost" className={dark ? "text-slate-300 hover:text-white hover:bg-white/10" : ""}>
                  {t('header.about')}
                </Button>
              </Link>

              <Link href={getLocalePath("/help")}>
                <Button variant="ghost" className={dark ? "text-slate-300 hover:text-white hover:bg-white/10" : ""}>
                  {t('header.help')}
                </Button>
              </Link>
            </nav>

            {/* Professionals Page Buttons */}
            {showProfessionalsPageButtons && currentUser && (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link href={getLocalePath("/dashboard")}>{t('header.dashboard')}</Link>
                </Button>
                {currentUserType === "company" && (
                  <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                    <Link href={getLocalePath("/jobs/new")}>{t('header.postJob')}</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {showAuth && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language & Region Selector - Hidden when user is signed in */}
              {!currentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openLanguageModal}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 ${dark ? "hover:bg-white/10" : "hover:bg-accent"}`}
                  aria-label="Change language and region"
                >
                  <Globe className={`h-4 w-4 ${dark ? "text-slate-300" : "text-gray-600"}`} />
                  {isMounted && (
                    <span className={`hidden sm:inline text-xs sm:text-sm ${dark ? "text-slate-300" : "text-gray-700"}`}>
                      {getDisplayText(languageRegionState)}
                    </span>
                  )}
                </Button>
              )}

              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">{t('header.loading')}</span>
                </div>
              ) : currentUser ? (
                <>
                  {/* Mobile: Notification Bell only */}
                  <div className="flex md:hidden items-center gap-2">
                    <NotificationBell iconClassName="h-9 w-9" />
                  </div>
                  {/* Desktop: Full navigation */}
                  <div className={`hidden md:flex items-center space-x-4 ${dark ? "text-slate-200" : ""}`}>
                    <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                      <Link href={getLocalePath(
                        currentUserType === "homeowner"    ? "/dashboard/homeowner" :
                        currentUserType === "professional" ? "/dashboard/professional" :
                        currentUserType === "contractor"   ? "/dashboard/contractor" :
                        currentUserType === "jobseeker"    ? "/dashboard/jobseeker" :
                        currentUserType === "company" || currentUserType === "employer" ? "/dashboard/company" :
                        "/dashboard"
                      )}>{t('header.dashboard')}</Link>
                    </Button>
                    {/* Message Icon */}
                    <MessageIcon user={currentUser} />
                    {/* Notification Bell */}
                    <NotificationBell />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex items-center space-x-1 px-1 py-1 ${dark ? "text-slate-200 hover:text-white hover:bg-white/10" : "hover:bg-accent"}`}
                      >
                        {profilePhotoUrl ? (
                          <Avatar className="h-6 w-6 rounded-full">
                            <AvatarImage
                              src={profilePhotoUrl}
                              className="object-cover w-full h-full rounded-full"
                            />
                            <AvatarFallback className="text-xs rounded-full">
                              {currentUserType === "company" ? (
                                <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        ) : currentUserType === "company" ? (
                          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        <span className="hidden sm:inline text-xs sm:text-sm font-medium">
                          {(() => {
                            // Priority order for email display
                            const email = currentUser.email ||
                                        currentUser.user_metadata?.email ||
                                        currentUser.new_email ||
                                        currentUser.user_metadata?.preferred_username

                            // Validate email format and truncate if needed
                            if (email && typeof email === 'string') {
                              const cleanEmail = email.trim()
                              if (cleanEmail.length > 25) {
                                return cleanEmail.substring(0, 22) + '...'
                              }
                              return cleanEmail
                            }

                            return 'User'
                          })()}
                        </span>
                        <ChevronDown className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 sm:w-64 z-[100]">
                      {currentUserType === "professional" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            {t('header.professionalProfile')}
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/profile/edit")} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {t('header.editProfile')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/professional")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            {t('header.enquiriesComingSoon')}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/professional/saved")} className="flex items-center">
                              <BookmarkIcon className="h-4 w-4 mr-2" />
                              {t('header.savedJobs')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/account/settings")} className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              {t('header.accountSettings')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : currentUserType === "company" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            {t('header.companyProfile')}
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/company/profile/edit")} className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2" />
                              {t('header.editProfile')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/company")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/company/my-applications")} className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {t('header.myApplications')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/company/subscription")} className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2" />
                              {t('header.subscriptionPlan')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            {t('header.enquiriesComingSoon')}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/company/saved")} className="flex items-center">
                              <BookmarkIcon className="h-4 w-4 mr-2" />
                              {t('header.savedJobs')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <User className="h-4 w-4 mr-2" />
                            {t('header.savedTalents')}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/account/settings")} className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              {t('header.accountSettings')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : currentUserType === "homeowner" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            Homeowner Profile
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/homeowner/profile")} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {t('header.editProfile')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/homeowner")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            {t('header.enquiriesComingSoon')}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard/homeowner/jobs")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              My Jobs
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/account/settings")} className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              {t('header.accountSettings')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : currentUserType === "contractor" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            Contractor Profile
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/contractor/profile/edit")} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {t('header.editProfile')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            {t('header.userProfile')}
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/profile/edit")} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {t('header.editProfile')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/dashboard")} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-purple-600 border-b">
                            {t('header.adminTools')}
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/dashboard")} className="flex items-center text-purple-600 font-medium">
                              <Shield className="h-4 w-4 mr-2" />
                              {t('header.dashboard')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/analytics")} className="flex items-center text-purple-600 font-medium">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              {t('header.analytics')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/settings")} className="flex items-center text-purple-600 font-medium">
                              <Settings className="h-4 w-4 mr-2" />
                              {t('header.settings')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/users")} className="flex items-center text-purple-600 font-medium">
                              <User className="h-4 w-4 mr-2" />
                              {t('header.manageUsers')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/jobs")} className="flex items-center text-purple-600 font-medium">
                              <Briefcase className="h-4 w-4 mr-2" />
                              {t('header.manageJobs')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={getLocalePath("/admin/payments")} className="flex items-center text-purple-600 font-medium">
                              <CreditCard className="h-4 w-4 mr-2" />
                              {t('header.payments')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? t('header.refreshing') : t('header.refreshProfile')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={handleSignOut}
                        onClick={handleSignOut}
                        className="flex items-center text-red-600 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('header.signOut')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </>
              ) : (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Link href={loginUrl}>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 bg-transparent ${dark ? "border-slate-600 text-slate-200 hover:bg-white/10 hover:text-white" : ""}`}
                    >
                      {t('header.signIn')}
                    </Button>
                  </Link>
                  <Link href={signUpUrl}>
                    <Button
                      size="sm"
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      {t('header.signUp')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <OnboardingFlow
              onClose={() => setShowOnboarding(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[100010] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-0 left-0 h-full w-72 bg-white z-[100011] shadow-2xl md:hidden overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('header.menu')}</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-4">
              {/* About */}
              <div>
                <Link
                  href={getLocalePath("/about")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {t('header.about')}
                </Link>
              </div>

              {/* Help */}
              <div>
                <Link
                  href={getLocalePath("/help")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {t('header.help')}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
