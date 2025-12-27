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
import { User, Building2, LogOut, Settings, FileText, Briefcase, ChevronDown, BookmarkIcon, RefreshCw, Shield, CreditCard, X, BarChart3, Menu, ChevronRight, Home, Globe } from "lucide-react"
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
}

export function Header({ user, userType, showAuth = true, onSignOut, profilePhotoUrl, showProfessionalsPageButtons = false, isModal = false, onModalClose }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, locale } = useTranslation()
  const [clientUser, setClientUser] = useState(user)
  const [clientUserType, setClientUserType] = useState(userType)
  const [isLoading, setIsLoading] = useState(false) // Don't show loading by default
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showUsefulInfoModal, setShowUsefulInfoModal] = useState<string | null>(null)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [usefulInfoExpanded, setUsefulInfoExpanded] = useState(false)
  const [helpExpanded, setHelpExpanded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Language & Region context
  const { state: languageRegionState, openModal: openLanguageModal } = useLanguageRegion()

  // Locale-aware auth URLs
  const isOnBrRoute = pathname?.startsWith('/br')
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

  // FAQ data for Help Center
  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How do I create an account?",
          a: "Click 'Sign Up' in the header, choose whether you're a job seeker or employer, and fill in your details. You'll receive a verification email to activate your account."
        },
        {
          q: "Is Open Job Market free to use?",
          a: "Yes! Searching for jobs and browsing talent is completely free. Employers can post jobs and message candidates with our subscription plans."
        },
        {
          q: "Can I use the platform anonymously?",
          a: "Absolutely! You can browse jobs and search for opportunities without revealing your identity. Your current employer won't know you're looking."
        }
      ]
    },
    {
      category: "For Job Seekers",
      questions: [
        {
          q: "How do I search for jobs?",
          a: "Use the search bar on the homepage to enter your desired job title, skill, or trade. Click one of the four search buttons (Vacancies, Jobs/Tasks, Tradespeople, Talent) to see results on an interactive map."
        },
        {
          q: "How do employers find me?",
          a: "Complete your profile with your skills, experience, and location. Enable 'Let employers find me' in your profile settings so recruiters can contact you directly."
        },
        {
          q: "Can I apply to jobs without a full profile?",
          a: "Yes, but a complete profile significantly increases your chances. Employers prefer candidates with detailed information, photos, and CVs."
        }
      ]
    },
    {
      category: "For Employers",
      questions: [
        {
          q: "How do I post a job?",
          a: "After signing up as a company, go to your dashboard and click 'Post Job'. Fill in the job details, location, salary, and requirements, then publish."
        },
        {
          q: "How do I find candidates?",
          a: "Use the talent search feature to filter candidates by location, skills, experience, and availability. You can message them directly through the platform."
        },
        {
          q: "What subscription plans are available?",
          a: "We offer Basic, Professional, and Enterprise plans with varying features like job posts, candidate searches, and priority support. Visit your dashboard to view pricing."
        }
      ]
    },
    {
      category: "For Tradespeople & Homeowners",
      questions: [
        {
          q: "How do tradespeople get hired?",
          a: "Create a profile showcasing your trade, services, certifications, and past work. Homeowners and businesses can find you through search or you can apply to posted jobs."
        },
        {
          q: "How do homeowners hire tradespeople?",
          a: "Post a job describing your project, or search for tradespeople in your area. Review profiles, check ratings, compare quotes, and hire directly."
        },
        {
          q: "Are tradespeople verified?",
          a: "Tradespeople can upload certifications, insurance documents, and professional registrations. Always check profiles for verified credentials before hiring."
        }
      ]
    },
    {
      category: "Account & Privacy",
      questions: [
        {
          q: "How do I delete my account?",
          a: "Go to Account Settings > Privacy > Delete Account. Note that this action is permanent and cannot be undone."
        },
        {
          q: "How is my data protected?",
          a: "We use industry-standard encryption and security measures. Your personal data is never sold to third parties. Read our Privacy Policy for full details."
        },
        {
          q: "Can I hide my profile from specific companies?",
          a: "Yes! In your privacy settings, you can block specific companies from viewing your profile or contacting you."
        }
      ]
    },
    {
      category: "Payments & Billing",
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards (Visa, Mastercard, Amex), debit cards, and PayPal through our secure payment processor Stripe."
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes, you can cancel anytime from your subscription settings. You'll retain access until the end of your billing period."
        },
        {
          q: "Do you offer refunds?",
          a: "We offer a 14-day money-back guarantee for new subscriptions. Contact support if you're not satisfied with our service."
        }
      ]
    }
  ]

  // Listen for auth state changes
  useEffect(() => {
    console.log('[HEADER] Setting up auth listener', { serverUser: !!user, serverUserType: userType })

    const supabase = createClient()

    // If we have a server user, check if they're an admin
    if (user) {
      console.log('[HEADER] Using server user, checking admin status')
      const checkAdminStatus = async () => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', user.id)
            .single()

          console.log('[HEADER] Server user type:', userData?.user_type)
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
          console.log('[HEADER] Auth check error:', error.message)
          setClientUser(null)
          setClientUserType(undefined)
          return
        }

        if (authUser) {
          console.log('[HEADER] User authenticated:', authUser.email)
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
          console.log('[HEADER] No authenticated user')
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
        console.log('[HEADER] Auth state changed:', event, 'has session:', !!session)

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
    console.log('[HEADER] Sign out clicked')
    try {
      if (onSignOut) {
        console.log('[HEADER] Using onSignOut callback')
        onSignOut()
      } else {
        console.log('[HEADER] Clearing storage and signing out')
        // Clear storage first
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }

        // Use server-side sign out action which will redirect
        console.log('[HEADER] Calling server signOut action')
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

  console.log('[HEADER] Render state:', {
    currentUser: !!currentUser,
    currentUserEmail: currentUser?.email,
    currentUserMetadataEmail: currentUser?.user_metadata?.email,
    currentUserNewEmail: currentUser?.new_email,
    currentUserType,
    isLoading,
    serverUser: !!user,
    serverUserEmail: user?.email,
    serverUserMetadataEmail: user?.user_metadata?.email,
    emailToDisplay: currentUser?.email || currentUser?.user_metadata?.email || currentUser?.new_email || currentUser?.user_metadata?.preferred_username || 'User'
  })

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const supabase = createClient()
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser()

      if (error) {
        // Handle session errors in manual refresh
        if (error.message === 'Auth session missing!' ||
            error.message === 'Invalid JWT' ||
            error.message.includes('AuthSessionMissingError')) {
          console.log('[HEADER] Session error in manual refresh, clearing local auth state')
        } else {
          console.error('[HEADER] Manual refresh error:', error)
        }
        setClientUser(null)
        setClientUserType(undefined)
        return
      }

      console.log('[HEADER] Manual refresh result:', {
        hasUser: !!refreshedUser,
        email: refreshedUser?.email,
        metadataEmail: refreshedUser?.user_metadata?.email
      })

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

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-2 py-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => {
                // If in modal mode, close the modal instead of navigating
                if (isModal && onModalClose) {
                  console.log('[HEADER] Logo clicked in modal mode, closing modal')
                  onModalClose()
                  return
                }

                // Determine target URL based on multiple factors
                const serverUserType = userType
                const effectiveUserType = serverUserType || currentUserType
                const hasUser = user || clientUser

                // Always redirect to homepage (unified search page) for all users
                let targetUrl = getLocalePath("/")

                // Don't redirect if already on the target page
                if (pathname === targetUrl || (targetUrl === "/" && pathname === "/")) {
                  console.log('[HEADER] Already on target page:', targetUrl)
                  return
                }

                console.log('[HEADER] Logo clicked:', {
                  currentUserType,
                  serverUserType,
                  effectiveUserType,
                  pathname,
                  targetUrl,
                  hasUser,
                  user: !!user,
                  clientUser: !!clientUser
                })

                router.push(targetUrl)
              }}
              className="hover:opacity-80 transition-opacity cursor-pointer flex items-center"
            >
              <Image
                src="/Logo.png"
                alt="Open Job Market"
                width={100}
                height={32}
                className="h-8 w-auto max-h-8 flex-shrink-0"
                priority
              />
            </div>

            {/* Mobile Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <nav className="hidden md:flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => setShowAboutModal(true)}
              >
                {t('header.about')}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>{t('header.usefulInfo')}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-2 text-sm font-semibold border-b">{t('header.frequentlyAsked')}</div>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('jobseekers')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t('header.forJobseekers')}</span>
                      <span className="text-xs text-muted-foreground">{t('header.findingJobsTips')}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('employers')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t('header.forEmployers')}</span>
                      <span className="text-xs text-muted-foreground">{t('header.hiringLaw')}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('tradespeople')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t('header.forTradespeople')}</span>
                      <span className="text-xs text-muted-foreground">{t('header.gettingWork')}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('homeowners')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t('header.forHomeowners')}</span>
                      <span className="text-xs text-muted-foreground">{t('header.hiringSafely')}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>{t('header.help')}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-2 text-sm font-semibold border-b">{t('header.helpSupport')}</div>

                  <DropdownMenuItem onClick={() => setShowHelpModal(true)} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t('header.helpCenterFAQ')}</span>
                      <span className="text-xs text-muted-foreground">{t('header.commonQuestions')}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <a href="mailto:support@openjobmarket.com" className="cursor-pointer">
                      <div className="flex flex-col items-start py-1">
                        <span className="font-medium">{t('header.contactSupport')}</span>
                        <span className="text-xs text-muted-foreground">{t('header.emailSupport')}</span>
                      </div>
                    </a>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href={getLocalePath("/contact")} className="cursor-pointer">
                      <div className="flex flex-col items-start py-1">
                        <span className="font-medium">{t('header.reportBug')}</span>
                        <span className="text-xs text-muted-foreground">{t('header.helpImprove')}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 hover:bg-accent"
                  aria-label="Change language and region"
                >
                  <Globe className="h-4 w-4 text-gray-600" />
                  {isMounted && (
                    <span className="hidden sm:inline text-xs sm:text-sm text-gray-700">
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
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Dashboard Button - Home icon on mobile, Button on desktop */}
                  <Link
                    href={getLocalePath("/dashboard")}
                    className="sm:hidden"
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Home className="h-5 w-5 text-green-600" />
                    </Button>
                  </Link>
                  <Button asChild size="sm" className="hidden sm:inline-flex bg-green-600 hover:bg-green-700 text-xs">
                    <Link href={getLocalePath("/dashboard")}>{t('header.dashboard')}</Link>
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
                        className="flex items-center space-x-1 px-1 py-1 hover:bg-accent"
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
                    <DropdownMenuContent align="end" className="w-56 sm:w-64">
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
              ) : (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Link href={loginUrl}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 bg-transparent"
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

      {/* Useful Info Modals */}
      {showUsefulInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100015] flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-lg shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowUsefulInfoModal(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[85vh] p-8">
              {/* Jobseekers */}
              {showUsefulInfoModal === 'jobseekers' && (
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">For Jobseekers</h2>
                  <p className="text-gray-600 mb-6">Finding jobs and career tips</p>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How can I improve my chances of finding a better job?</h3>
                      <p className="text-gray-700 leading-relaxed">Create a complete profile on Open Job Market, list all your skills, upload a CV, and use a real photo to build trust. Enable 'Let employers find me' so recruiters can contact you directly.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Should I wait for companies to contact me or apply myself?</h3>
                      <p className="text-gray-700 leading-relaxed">Do both. Apply for roles that match your skills and also make your profile searchable so employers can find you.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I know what salary to ask for?</h3>
                      <p className="text-gray-700 leading-relaxed">Use online salary checkers such as <a href="https://www.check-a-salary.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Check-a-Salary</a>, <a href="https://www.prospects.ac.uk/jobs-and-work-experience/job-hunting/salary-calculator" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Prospects</a>, or <a href="https://www.glassdoor.co.uk/Salaries/index.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Glassdoor</a>. Compare salaries in your area and industry before applying.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I stand out to employers?</h3>
                      <p className="text-gray-700 leading-relaxed">Highlight key achievements, add certifications, write a short intro about your strengths, and show relevant experience. A clean profile with no spelling mistakes helps too.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Can employers find me based on my location?</h3>
                      <p className="text-gray-700 leading-relaxed">Yes. Many companies prefer candidates who live close to the job site to reduce travel time and improve reliability.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Where can I check my employment rights?</h3>
                      <p className="text-gray-700 leading-relaxed">Use <a href="https://www.gov.uk/browse/working" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">GOV.UK</a> or <a href="https://www.acas.org.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">ACAS</a> for worker rights, notice periods, redundancy, sick pay, holidays and minimum wage rules.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Employers */}
              {showUsefulInfoModal === 'employers' && (
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">For Employers</h2>
                  <p className="text-gray-600 mb-6">Hiring and employment law guidance</p>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How can I find the right candidate quickly?</h3>
                      <p className="text-gray-700 leading-relaxed">Post a job with clear details or directly search candidates near your location. People often prefer roles close to home, so filtering by postcode works well.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Is it better to search for candidates or wait for applications?</h3>
                      <p className="text-gray-700 leading-relaxed">Searching is faster. You can message jobseekers who match your criteria instead of waiting for them to apply.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I set the right salary?</h3>
                      <p className="text-gray-700 leading-relaxed">Check average salaries using resources like <a href="https://www.glassdoor.co.uk/Salaries/index.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Glassdoor</a>, <a href="https://uk.indeed.com/career/salaries" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Indeed Salary Guide</a>, and <a href="https://www.check-a-salary.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Check-a-Salary.co.uk</a>. Offering a competitive rate attracts better candidates.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Can I hire freelancers or part-time workers?</h3>
                      <p className="text-gray-700 leading-relaxed">Yes. When posting a job, choose the work type (full-time, part-time, freelance, or contract) to attract the right people.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Where do I check UK employment laws and contracts?</h3>
                      <p className="text-gray-700 leading-relaxed">Visit <a href="https://www.gov.uk/browse/employing-people" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">GOV.UK</a>, <a href="https://www.acas.org.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">ACAS</a>, or <a href="https://www.cipd.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">CIPD</a> for legal guidance, contracts, working hours, probation periods, and employee rights.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I manage tax and payroll for new staff?</h3>
                      <p className="text-gray-700 leading-relaxed">Use <a href="https://www.gov.uk/topic/business-tax/paye" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">HMRC tools</a> or payroll services. For contractors or freelancers, ensure you check <a href="https://www.gov.uk/guidance/understanding-off-payroll-working-ir35" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">IR35 rules</a> and payment terms.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tradespeople */}
              {showUsefulInfoModal === 'tradespeople' && (
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">For Tradespeople</h2>
                  <p className="text-gray-600 mb-6">Getting work and qualifications</p>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How can I get more trade jobs?</h3>
                      <p className="text-gray-700 leading-relaxed">Create a full profile listing your trade, experience, services, photos, and qualifications. Enable visibility so homeowners and companies can contact you.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Can I offer services and also apply for jobs?</h3>
                      <p className="text-gray-700 leading-relaxed">Yes. You can search for trade jobs posted by homeowners and companies while also advertising your services.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I set my rates?</h3>
                      <p className="text-gray-700 leading-relaxed">Check local averages on websites like <a href="https://www.checkatrade.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Checkatrade</a>, <a href="https://www.ratedpeople.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Rated People</a>, or <a href="https://www.check-a-salary.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Check-a-Salary</a>. Consider travel time, materials, and experience.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Do I need insurance?</h3>
                      <p className="text-gray-700 leading-relaxed">Public liability insurance is strongly recommended. It protects you if property is damaged or someone is injured on the job.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I build trust with clients?</h3>
                      <p className="text-gray-700 leading-relaxed">Add real photos, certifications, previous work examples, and reviews from past clients.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Where can I find training or trade qualifications?</h3>
                      <p className="text-gray-700 leading-relaxed">Use local colleges, NVQ centres, <a href="https://www.citb.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">CITB</a>, or trade academies for electrician, plumbing, carpentry, tiling and more.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Homeowners */}
              {showUsefulInfoModal === 'homeowners' && (
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">For Homeowners</h2>
                  <p className="text-gray-600 mb-6">Hiring tradespeople safely</p>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How can I find the right tradesperson?</h3>
                      <p className="text-gray-700 leading-relaxed">Post your job with a clear description and budget, or search profiles of local tradespeople with reviews, photos and verified skills.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Do I need to give a full address when posting a job?</h3>
                      <p className="text-gray-700 leading-relaxed">No. You can give a general location or postcode so tradespeople know the job area. Exact address is only needed for confirmed bookings.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I compare quotes?</h3>
                      <p className="text-gray-700 leading-relaxed">Request quotes from several tradespeople. Compare based on experience, reviews, availability and what the price includes.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">How do I know if someone is qualified?</h3>
                      <p className="text-gray-700 leading-relaxed">Check their profile for certifications, uploaded documents and reviews. For electricians or gas engineers, look for <a href="https://www.niceic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">NICEIC</a> or <a href="https://www.gassaferegister.co.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Gas Safe</a> registration.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">Is it safe to hire someone directly?</h3>
                      <p className="text-gray-700 leading-relaxed">Use tradespeople with verified profiles and visible feedback. Always agree payment terms and scope of work before starting.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="text-lg font-semibold mb-2">What if the job changes or costs more?</h3>
                      <p className="text-gray-700 leading-relaxed">Discuss changes before work begins. Ask for updated quotes in writing so both sides are clear and protected.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Center & FAQ Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100015] flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-lg shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => {
                setShowHelpModal(false)
                setExpandedFAQ(null)
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[85vh] p-8">
              <h2 className="text-3xl font-bold text-blue-600 mb-2">Help Center & FAQ</h2>
              <p className="text-gray-600 mb-8">Find answers to common questions about using Open Job Market</p>

              <div className="space-y-6">
                {faqs.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border-b pb-6 last:border-b-0">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                      {category.category}
                    </h3>
                    <div className="space-y-3 ml-5">
                      {category.questions.map((faq, faqIndex) => {
                        const uniqueIndex = categoryIndex * 100 + faqIndex
                        return (
                          <div key={faqIndex} className="border rounded-lg">
                            <button
                              onClick={() => setExpandedFAQ(expandedFAQ === uniqueIndex ? null : uniqueIndex)}
                              className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="font-medium text-gray-800">{faq.q}</span>
                              {expandedFAQ === uniqueIndex ? (
                                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0 rotate-180" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                              )}
                            </button>
                            {expandedFAQ === uniqueIndex && (
                              <div className="px-4 pb-4 text-gray-700 leading-relaxed">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-gray-800 mb-2">Still have questions?</h4>
                <p className="text-gray-700 mb-3">Can't find the answer you're looking for? Our support team is here to help.</p>
                <div className="flex gap-3">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <a href="mailto:support@openjobmarket.com">
                      Contact Support
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/contact">
                      Report a Bug
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100015] flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-lg shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[85vh] p-8">
              <h2 className="text-4xl font-bold text-blue-600 mb-3">Welcome to Open Job Market</h2>
              <p className="text-xl text-gray-600 mb-8">Where opportunities meet talent, simply and securely</p>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border-l-4 border-blue-500">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">What Is Open Job Market?</h3>
                  <p className="text-lg text-gray-700 leading-relaxed mb-3">
                    Open Job Market is an award-nominated, map-based platform to search, compare, and connect with jobs, talent, skilled tradespeople, and trade work — all in one place.
                  </p>
                  <p className="text-base text-gray-600 italic">
                    Recognized by industry experts as one of the most promising startups of the year.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-blue-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🔍</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Search Like Google, But for Jobs</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Our intuitive map-based search makes finding jobs or talent as easy as searching on Google.
                      Simply enter what you're looking for, and see relevant opportunities on an interactive map.
                      Filter by location, skills, salary, and more—it's never been easier.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-green-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🎭</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Anonymous & Private</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Already employed but looking for better opportunities? Browse jobs completely anonymously without disclosing
                      your personal data or alerting your current employer. Your privacy is our priority.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-purple-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">💼</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">For Job Seekers</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Whether you're actively searching or just exploring, find your next opportunity with ease.
                      Search by trade, profession, or skill. Apply directly or let employers find you.
                      Perfect for career changers, graduates, and experienced professionals alike.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-orange-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🏢</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">For Employers & Companies</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Post jobs in minutes or search for qualified candidates directly.
                      Find local talent, review profiles, and connect instantly.
                      From full-time positions to freelance gigs—hire faster and smarter.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-yellow-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🔧</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">For Tradespeople</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Plumbers, electricians, builders, and more—showcase your skills and get hired for jobs near you.
                      Build your profile, display your work, and connect with homeowners and businesses looking for your expertise.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-red-100 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🏠</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">For Homeowners</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Need a tradesperson? Post your job and receive quotes from verified local professionals,
                      or search for tradespeople in your area. Compare reviews, check qualifications, and hire with confidence.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-l-4 border-green-500">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Why Open Job Market?</h3>
                  <ul className="space-y-3 text-lg text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-600 font-bold mr-3">✓</span>
                      <span><strong>Fast & Easy:</strong> No complicated forms—search, compare, and connect in seconds</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 font-bold mr-3">✓</span>
                      <span><strong>Location-Based:</strong> Find opportunities right in your neighborhood or city</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 font-bold mr-3">✓</span>
                      <span><strong>Secure & Private:</strong> Browse anonymously, control what you share</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 font-bold mr-3">✓</span>
                      <span><strong>All-in-One:</strong> Jobs, trades, freelance work, and talent—everything in one platform</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 font-bold mr-3">✓</span>
                      <span><strong>Free to Search:</strong> Explore opportunities at no cost</span>
                    </li>
                  </ul>
                </div>

                <div className="text-center py-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white">
                  <h3 className="text-2xl font-bold mb-2">Making Life Easier for Everyone</h3>
                  <p className="text-lg">
                    Whether you're looking for your dream job, hiring top talent, or finding a reliable tradesperson—
                    Open Job Market simplifies the entire process. Join thousands of users who've already discovered
                    a better way to work.
                  </p>
                </div>
              </div>
            </div>
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
                <button
                  onClick={() => {
                    setShowAboutModal(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {t('header.about')}
                </button>
              </div>

              {/* Useful Info - Collapsible */}
              <div className="border-b pb-2">
                <button
                  onClick={() => setUsefulInfoExpanded(!usefulInfoExpanded)}
                  className="w-full flex items-center justify-between font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{t('header.usefulInfo')}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${usefulInfoExpanded ? 'rotate-90' : ''}`} />
                </button>
                {usefulInfoExpanded && (
                  <div className="pl-3 mt-2 space-y-2 text-sm">
                    <button
                      onClick={() => {
                        setShowUsefulInfoModal('jobseekers')
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left text-blue-600 hover:text-blue-700 pl-2"
                    >
                      {t('header.forJobseekers')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUsefulInfoModal('employers')
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left text-blue-600 hover:text-blue-700 pl-2"
                    >
                      {t('header.forEmployers')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUsefulInfoModal('tradespeople')
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left text-blue-600 hover:text-blue-700 pl-2"
                    >
                      {t('header.forTradespeople')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUsefulInfoModal('homeowners')
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left text-blue-600 hover:text-blue-700 pl-2"
                    >
                      {t('header.forHomeowners')}
                    </button>
                  </div>
                )}
              </div>

              {/* Help - Collapsible */}
              <div className="border-b pb-2">
                <button
                  onClick={() => setHelpExpanded(!helpExpanded)}
                  className="w-full flex items-center justify-between font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{t('header.help')}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${helpExpanded ? 'rotate-90' : ''}`} />
                </button>
                {helpExpanded && (
                  <div className="pl-3 mt-2 space-y-2 text-sm">
                    <button
                      onClick={() => {
                        setShowHelpModal(true)
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left text-blue-600 hover:text-blue-700 pl-2"
                    >
                      {t('header.helpCenterFAQ')}
                    </button>
                    <a href="mailto:support@openjobmarket.com" className="block text-blue-600 hover:text-blue-700 pl-2">
                      {t('header.contactSupport')}
                    </a>
                    <Link href={getLocalePath("/contact")} className="block text-blue-600 hover:text-blue-700 pl-2">
                      {t('header.reportBug')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
