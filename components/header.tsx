"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Building2, LogOut, Settings, FileText, Briefcase, ChevronDown, BookmarkIcon, RefreshCw, Shield, CreditCard, X, BarChart3 } from "lucide-react"
import { MessageIcon } from "@/components/message-icon"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"
import { manualLogout } from "@/hooks/use-auto-logout"
import { useEffect, useState } from "react"
import { signOut } from "@/lib/actions"
import { OnboardingFlow } from "./onboarding/OnboardingFlow"

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
  const [clientUser, setClientUser] = useState(user)
  const [clientUserType, setClientUserType] = useState(userType)
  const [isLoading, setIsLoading] = useState(false) // Don't show loading by default
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showUsefulInfoModal, setShowUsefulInfoModal] = useState<string | null>(null)
  const [showAboutModal, setShowAboutModal] = useState(false)

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
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
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
                let targetUrl = "/"

                // Don't redirect if already on the target page
                if (pathname === targetUrl) {
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
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">Open Job Market</h1>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Button
                variant="ghost"
                onClick={() => setShowAboutModal(true)}
              >
                About
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>Courses</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-96 max-h-[600px] overflow-y-auto">
                  <div className="px-3 py-2 text-sm font-semibold border-b">Training Courses by Trade</div>

                  {/* Plumbing Courses */}
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 mt-2">Plumbing</div>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/plumbing-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Introduction to Plumbing - Able Skills</span>
                      <span className="text-xs text-muted-foreground">£495 inc VAT | Basic training for beginners</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/plumbing-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Level 2 Plumbing Course - Able Skills</span>
                      <span className="text-xs text-muted-foreground">£3,195 inc VAT | Full theory + practical</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://tradespathwayacademy.org/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Weekend/Part-time Plumbing - Trades Pathway</span>
                      <span className="text-xs text-muted-foreground">Contact for pricing | Flexible schedule</span>
                    </a>
                  </DropdownMenuItem>

                  {/* Electrical Courses */}
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 mt-2">Electrical Installation</div>
                  <DropdownMenuItem asChild>
                    <a href="https://www.tradeskills4u.co.uk/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Level 2 Electrical Installations - TradeSkills4U</span>
                      <span className="text-xs text-muted-foreground">Contact for pricing | Evening & weekday options</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://tradespathwayacademy.org/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Weekend/Part-time Electrical - Trades Pathway</span>
                      <span className="text-xs text-muted-foreground">Contact for pricing | Career changers welcome</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ekctraining.ac.uk/our-centres/ekc-plumbing-and-electrical-training-centre-ashford/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Plumbing & Electrical Level 1/2/3 - EKC Ashford</span>
                      <span className="text-xs text-muted-foreground">Call 01233 743174 | Heat pumps & retrofit</span>
                    </a>
                  </DropdownMenuItem>

                  {/* Bricklaying Courses */}
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 mt-2">Bricklaying</div>
                  <DropdownMenuItem asChild>
                    <a href="https://plasteringworkshop.co.uk/product/one-day-bricklaying-3/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">1-Day Bricklaying Workshop</span>
                      <span className="text-xs text-muted-foreground">£179 | Introduction to basics</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://silvertrowel.co.uk/product/4-day-introduction-to-bricklaying-course/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">4-Day Introduction to Bricklaying - Silver Trowel</span>
                      <span className="text-xs text-muted-foreground">£425 | Hands-on practical</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.goldtrowel.co.uk/bricklaying/diy-courses/bricklaying-diy-5-day-course.htm" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">5-Day Bricklaying - Goldtrowel Academy</span>
                      <span className="text-xs text-muted-foreground">£595 | Setting out, mortar mixing, laying</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/bricklaying-training-courses/city-guilds-bricklaying-training-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">City & Guilds Bricklaying (3 weeks) - Able Skills</span>
                      <span className="text-xs text-muted-foreground">£1,495 inc VAT | Basic qualification</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/bricklaying-training-courses/nvq-level-2-bricklaying-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">NVQ Level 2 Bricklaying (8 weeks) - Able Skills</span>
                      <span className="text-xs text-muted-foreground">Contact for pricing | Full qualification</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.salttraininglimited.co.uk/category/brick-laying-courses" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Level 1 & 2 Diploma - Salt Training</span>
                      <span className="text-xs text-muted-foreground">£799 | Beginners welcome</span>
                    </a>
                  </DropdownMenuItem>

                  {/* Tiling Courses */}
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 mt-2">Tiling</div>
                  <DropdownMenuItem asChild>
                    <a href="https://tradeteacher.co.uk/courses/5-day-wall-and-floor-tiling-course/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">5-Day Wall & Floor Tiling - TradeTeacher</span>
                      <span className="text-xs text-muted-foreground">£650 inc VAT | Fast-track for beginners</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.tiling-courses.co.uk/4-day-fast-track-tiling-course/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">4-Day Fast-Track Tiling - Tiling Academy</span>
                      <span className="text-xs text-muted-foreground">£599 | Advanced techniques</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/tiling-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Introduction to Tiling - Able Skills</span>
                      <span className="text-xs text-muted-foreground">£595 inc VAT | Weekdays/Weekends</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://tradeteacher.co.uk/courses/intensive-tiling-course/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">9-Day Intensive Tiling</span>
                      <span className="text-xs text-muted-foreground">£1,150 inc VAT | Comprehensive training</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.ableskills.co.uk/tiling-courses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">NVQ Level 2 Tiling - Able Skills</span>
                      <span className="text-xs text-muted-foreground">£2,995 inc VAT | Full qualification</span>
                    </a>
                  </DropdownMenuItem>

                  {/* Multi-skill Construction Courses */}
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 mt-2">Multi-Skill Construction</div>
                  <DropdownMenuItem asChild>
                    <a href="https://west-thames.ac.uk/courses/construction" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Construction Level 1/2 - West Thames College</span>
                      <span className="text-xs text-muted-foreground">Standard FE fees | Carpentry, plumbing, electrical</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.capitalccg.ac.uk/courses/construction-and-plumbing/552/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Construction & Plumbing - Capital CCG London</span>
                      <span className="text-xs text-muted-foreground">Contact for pricing | Vocational training</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://nationalcareers.service.gov.uk/find-a-course/page?searchTerm=building+installation" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Level 1 Construction Skills</span>
                      <span className="text-xs text-muted-foreground">£2,200 (6 weeks) | Entry-level trades</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.harrow.ac.uk/courses/construction-building-services-plumbing" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Construction & Building Services - Harrow College</span>
                      <span className="text-xs text-muted-foreground">Various levels | T-level & advanced diplomas</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.wlc.ac.uk/courses/construction-plumbing/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start py-2">
                      <span className="font-medium">Green Skills Centre - West London College</span>
                      <span className="text-xs text-muted-foreground">Entry 3 to Level 2 | Sustainable building</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>Useful info</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-2 text-sm font-semibold border-b">Frequently Asked Questions</div>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('jobseekers')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">For Jobseekers</span>
                      <span className="text-xs text-muted-foreground">Finding jobs & career tips</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('employers')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">For Employers</span>
                      <span className="text-xs text-muted-foreground">Hiring & employment law</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('tradespeople')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">For Tradespeople</span>
                      <span className="text-xs text-muted-foreground">Getting work & qualifications</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUsefulInfoModal('homeowners')} className="cursor-pointer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">For Homeowners</span>
                      <span className="text-xs text-muted-foreground">Hiring tradespeople safely</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>Help</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem>
                    <span className="text-muted-foreground">Coming soon...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Professionals Page Buttons */}
            {showProfessionalsPageButtons && currentUser && (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                {currentUserType === "company" && (
                  <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                    <Link href="/jobs/new">Post Job</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {showAuth && (
            <div className="flex items-center">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : currentUser ? (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Dashboard Button */}
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  {/* Message Icon */}
                  <MessageIcon user={currentUser} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 hover:bg-accent"
                      >
                        {profilePhotoUrl ? (
                          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 rounded-full">
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
                        <span className="text-xs sm:text-sm font-medium">
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
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 sm:w-64">
                      {currentUserType === "professional" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            Professional Profile
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href="/profile/edit" className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Edit profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/professional" className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            Enquiries (Coming soon)
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/professional/saved" className="flex items-center">
                              <BookmarkIcon className="h-4 w-4 mr-2" />
                              Saved jobs
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/account/settings" className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              Account Settings
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : currentUserType === "company" ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            Company Profile
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href="/company/profile/edit" className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2" />
                              Edit profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/company" className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/company/my-applications" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              My Applications
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/company/subscription" className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Subscription Plan
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-2" />
                            Enquiries (Coming soon)
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/company/saved" className="flex items-center">
                              <BookmarkIcon className="h-4 w-4 mr-2" />
                              Saved Jobs
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="flex items-center text-muted-foreground">
                            <User className="h-4 w-4 mr-2" />
                            Saved Talents (Coming soon)
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/account/settings" className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              Account Settings
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-foreground border-b">
                            User Profile
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href="/profile/edit" className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Edit profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard" className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-purple-600 border-b">
                            Admin Tools
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard" className="flex items-center text-purple-600 font-medium">
                              <Shield className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/analytics" className="flex items-center text-purple-600 font-medium">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Analytics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/settings" className="flex items-center text-purple-600 font-medium">
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/users" className="flex items-center text-purple-600 font-medium">
                              <User className="h-4 w-4 mr-2" />
                              Manage Users
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/jobs" className="flex items-center text-purple-600 font-medium">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Manage Jobs
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/payments" className="flex items-center text-purple-600 font-medium">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Payments
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
                        {isRefreshing ? 'Refreshing...' : 'Refresh Profile'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={handleSignOut}
                        onClick={handleSignOut}
                        className="flex items-center text-red-600 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Link href="/auth/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 bg-transparent"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button
                      size="sm"
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Sign Up
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">What We Do</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Open Job Market is a revolutionary platform that connects job seekers with employers, and homeowners with skilled tradespeople.
                    We've created the easiest, most transparent way to find opportunities or hire talent—all in one place.
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
    </header>
  )
}
