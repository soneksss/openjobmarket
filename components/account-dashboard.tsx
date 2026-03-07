"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  User,
  Building2,
  Briefcase,
  MessageCircle,
  Bell,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  FileText,
  CreditCard,
  Shield,
  BarChart3,
  Users,
  RefreshCw,
  CheckCircle2,
  Home,
  Star,
  MapPin,
  Eye,
  EyeOff,
  Zap,
  Info,
  TrendingUp
} from "lucide-react"
import { createClient } from "@/lib/client"
import { signOut } from "@/lib/actions"
import { useTranslation } from "@/lib/i18n/context"
import { usePathname, useRouter } from "next/navigation"

interface AccountDashboardProps {
  user: any
  userType: "company" | "professional" | "homeowner" | "contractor" | null
  profileData?: {
    name?: string
    email?: string
    photoUrl?: string
    isVerified?: boolean
    companyName?: string
    rating?: number
    totalReviews?: number
    jobsCompleted?: number
    profileVisible?: boolean
    activeJobs?: number
    // New fields for enhanced dashboard
    location?: string
    latitude?: number
    longitude?: number
    industry?: string
    description?: string
    logoUrl?: string
    services?: string[]
    websiteUrl?: string
    instantJobAlerts?: boolean
  }
}

interface MenuItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
  badgeColor?: string
  description?: string
  show?: boolean
}

export function AccountDashboard({ user, userType, profileData }: AccountDashboardProps) {
  const { t, locale } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [pendingApplications, setPendingApplications] = useState(0)
  const [activeJobs, setActiveJobs] = useState(profileData?.activeJobs || 0)
  const [jobsCompleted, setJobsCompleted] = useState(profileData?.jobsCompleted || 0)
  const [rating, setRating] = useState(profileData?.rating || 0)
  const [totalReviews, setTotalReviews] = useState(profileData?.totalReviews || 0)
  const [profileVisible, setProfileVisible] = useState(profileData?.profileVisible ?? true)
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // New state for enhanced features
  const [instantJobAlerts, setInstantJobAlerts] = useState(profileData?.instantJobAlerts ?? true)
  const [isTogglingAlerts, setIsTogglingAlerts] = useState(false)
  const [nearbyJobsCount, setNearbyJobsCount] = useState(0)
  const [profileViewsWeekly, setProfileViewsWeekly] = useState(0)

  const supabase = createClient()

  // Calculate profile completion percentage for company users
  const calculateProfileCompletion = () => {
    if (userType !== 'company') return 100
    const fields = [
      profileData?.companyName,
      profileData?.industry,
      profileData?.location,
      profileData?.description,
      profileData?.logoUrl || profileData?.photoUrl,
      profileData?.services && profileData.services.length > 0,
      profileData?.websiteUrl
    ]
    const completedCount = fields.filter(Boolean).length
    return Math.round((completedCount / fields.length) * 100)
  }

  const profileCompletionPercent = calculateProfileCompletion()

  const isOnBrRoute = locale === 'pt-BR' || pathname?.startsWith('/br')
  const getLocalePath = (path: string) => isOnBrRoute ? `/br${path}` : path

  useEffect(() => {
    fetchAllData()
    checkAdminStatus()

    // Set up real-time subscription for messages
    const channel = supabase
      .channel('account-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user?.id}` },
        () => fetchAllData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_applications' },
        () => fetchAllData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const checkAdminStatus = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.user_type === 'admin')
    } catch (err) {
      console.error('[ACCOUNT] Failed to check admin status:', err)
    }
  }

  const fetchAllData = async () => {
    if (!user?.id) return

    try {
      // Fetch unread messages
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (msgCount !== null) setUnreadMessages(msgCount)

      // Fetch unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (notifCount !== null) setUnreadNotifications(notifCount)

      // Fetch profile data based on user type
      if (userType === 'company') {
        // Get company profile with all needed fields
        const { data: companyProfile } = await supabase
          .from('company_profiles')
          .select('profile_visible, trade_job_notifications, latitude, longitude, id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (companyProfile) {
          setProfileVisible(companyProfile.profile_visible ?? true)
          setInstantJobAlerts(companyProfile.trade_job_notifications ?? true)

          // Fetch nearby jobs count
          if (companyProfile.latitude && companyProfile.longitude) {
            const { count: jobsCount } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true)
              .eq('is_tradespeople_job', true)
              .neq('company_id', companyProfile.id)

            setNearbyJobsCount(jobsCount || 0)
          }
        }

        // Get active jobs count (use company_id from company profile)
        if (companyProfile?.id) {
          const { count: jobCount } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyProfile.id)
            .eq('is_active', true)

          if (jobCount !== null) setActiveJobs(jobCount)

          // Get pending applications for company's jobs
          const { data: userJobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('company_id', companyProfile.id)

          if (userJobs && userJobs.length > 0) {
            const jobIds = userJobs.map(j => j.id)
            const { count: appCount } = await supabase
              .from('job_applications')
              .select('*', { count: 'exact', head: true })
              .in('job_id', jobIds)
              .eq('status', 'pending')

            if (appCount !== null) setPendingApplications(appCount)
          }
        }

        // Get company rating
        const { data: ratingData } = await supabase
          .from('company_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (ratingData) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', user.id)

          if (reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            setRating(avgRating)
            setTotalReviews(reviews.length)
          }
        }

      } else if (userType === 'professional') {
        // Get professional profile
        const { data: profProfile } = await supabase
          .from('professional_profiles')
          .select('id, profile_visible')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profProfile) {
          setProfileVisible(profProfile.profile_visible ?? true)
        }

        // Get professional's applications count (using profile ID, not user ID)
        if (profProfile?.id) {
          const { count: appCount } = await supabase
            .from('job_applications')
            .select('*', { count: 'exact', head: true })
            .eq('professional_id', profProfile.id)
            .eq('status', 'pending')

          if (appCount !== null) setPendingApplications(appCount)

          // Get completed jobs
          const { count: completedCount } = await supabase
            .from('job_applications')
            .select('*', { count: 'exact', head: true })
            .eq('professional_id', profProfile.id)
            .eq('status', 'completed')

          if (completedCount !== null) setJobsCompleted(completedCount)
        }

        // Get professional rating
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', user.id)

        if (reviews && reviews.length > 0) {
          const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          setRating(avgRating)
          setTotalReviews(reviews.length)
        }

      } else if (userType === 'homeowner') {
        // Get homeowner profile
        const { data: homeProfile } = await supabase
          .from('homeowner_profiles')
          .select('on_market')
          .eq('user_id', user.id)
          .maybeSingle()

        if (homeProfile) {
          setProfileVisible(homeProfile.on_market ?? true)
        }

        // Get active homeowner jobs
        const { count: jobCount } = await supabase
          .from('homeowner_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (jobCount !== null) setActiveJobs(jobCount)

        // Get pending applications for homeowner's jobs
        const { data: userJobs } = await supabase
          .from('homeowner_jobs')
          .select('id')
          .eq('user_id', user.id)

        if (userJobs && userJobs.length > 0) {
          const jobIds = userJobs.map(j => j.id)
          const { count: appCount } = await supabase
            .from('job_applications')
            .select('*', { count: 'exact', head: true })
            .in('job_id', jobIds)
            .eq('status', 'pending')

          if (appCount !== null) setPendingApplications(appCount)
        }
      }
    } catch (err) {
      console.error('[ACCOUNT] Failed to fetch data:', err)
    }
  }

  const handleToggleVisibility = async () => {
    setIsTogglingVisibility(true)
    const newVisibility = !profileVisible

    try {
      let table = ''
      let field = 'profile_visible'

      if (userType === 'company') {
        table = 'company_profiles'
      } else if (userType === 'professional') {
        table = 'professional_profiles'
      } else if (userType === 'homeowner') {
        table = 'homeowner_profiles'
        field = 'on_market'
      }

      if (table) {
        const { error } = await supabase
          .from(table)
          .update({ [field]: newVisibility })
          .eq('user_id', user.id)

        if (!error) {
          setProfileVisible(newVisibility)
        }
      }
    } catch (err) {
      console.error('[ACCOUNT] Failed to toggle visibility:', err)
    } finally {
      setIsTogglingVisibility(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllData()
    setIsRefreshing(false)
  }

  const handleToggleInstantAlerts = async () => {
    if (userType !== 'company') return
    setIsTogglingAlerts(true)
    const newStatus = !instantJobAlerts

    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({
          trade_job_notifications: newStatus,
          trade_job_notifications_distance: 10
        })
        .eq('user_id', user.id)

      if (!error) {
        setInstantJobAlerts(newStatus)
      }
    } catch (err) {
      console.error('[ACCOUNT] Failed to toggle instant alerts:', err)
    } finally {
      setIsTogglingAlerts(false)
    }
  }

  const handleSignOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      await signOut()
    } catch (error) {
      console.error('[ACCOUNT] Sign out error:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  // Build profile display name
  const displayName = profileData?.companyName || profileData?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = profileData?.email || user?.email || ''
  const avatarUrl = profileData?.photoUrl
  const isVerified = profileData?.isVerified

  // Menu items based on user type
  const getMenuItems = (): MenuItem[][] => {
    const commonItems: MenuItem[] = [
      {
        icon: MessageCircle,
        label: "Messages",
        href: getLocalePath("/messages"),
        badge: unreadMessages > 0 ? (unreadMessages > 9 ? "9+" : String(unreadMessages)) : undefined,
        badgeColor: "bg-red-500"
      },
      {
        icon: Bell,
        label: "Notifications",
        href: getLocalePath("/notifications"),
        badge: unreadNotifications > 0 ? (unreadNotifications > 9 ? "9+" : String(unreadNotifications)) : undefined,
        badgeColor: "bg-blue-500"
      }
    ]

    const savedItems: MenuItem = {
      icon: Bookmark,
      label: "Saved Items",
      href: getLocalePath(`/dashboard/${userType}/saved`),
    }

    const settingsItems: MenuItem[] = [
      {
        icon: Settings,
        label: "Account Settings",
        href: getLocalePath("/account/settings"),
      },
      {
        icon: HelpCircle,
        label: "Help & Support",
        href: getLocalePath("/help"),
      }
    ]

    if (userType === 'company') {
      return [
        [
          {
            icon: Briefcase,
            label: "My Job Listings",
            href: getLocalePath("/dashboard/company/jobs"),
            badge: activeJobs > 0 ? String(activeJobs) : undefined,
            badgeColor: "bg-green-500",
            description: "Manage your posted jobs"
          },
          {
            icon: Users,
            label: "Applications Received",
            href: getLocalePath("/dashboard/company/applications"),
            badge: pendingApplications > 0 ? String(pendingApplications) : undefined,
            badgeColor: "bg-amber-500",
            description: "Review applicants"
          },
          {
            icon: Briefcase,
            label: "Active Jobs",
            href: getLocalePath("/dashboard/company/my-applications"),
            description: "Jobs you're pursuing"
          }
        ],
        commonItems,
        [
          savedItems,
          {
            icon: Building2,
            label: "Edit Company Profile",
            href: getLocalePath("/company/profile/edit"),
          },
          {
            icon: CreditCard,
            label: "Subscription & Billing",
            href: getLocalePath("/dashboard/company/subscription"),
          }
        ],
        settingsItems
      ]
    }

    if (userType === 'professional') {
      return [
        [
          {
            icon: FileText,
            label: "My Applications",
            href: getLocalePath("/dashboard/professional/applications"),
            badge: pendingApplications > 0 ? String(pendingApplications) : undefined,
            badgeColor: "bg-blue-500",
            description: "Track your job applications"
          }
        ],
        commonItems,
        [
          savedItems,
          {
            icon: User,
            label: "Edit Profile",
            href: getLocalePath("/profile/edit"),
          }
        ],
        settingsItems
      ]
    }

    if (userType === 'homeowner') {
      return [
        [
          {
            icon: Home,
            label: "My Home Projects",
            href: getLocalePath("/dashboard/homeowner/jobs"),
            badge: activeJobs > 0 ? String(activeJobs) : undefined,
            badgeColor: "bg-green-500",
            description: "Manage your posted projects"
          },
          {
            icon: Users,
            label: "Applications Received",
            href: getLocalePath("/dashboard/homeowner/applications"),
            badge: pendingApplications > 0 ? String(pendingApplications) : undefined,
            badgeColor: "bg-amber-500",
            description: "Review contractors"
          }
        ],
        commonItems,
        [
          savedItems,
          {
            icon: User,
            label: "Edit Profile",
            href: getLocalePath("/dashboard/homeowner/profile"),
          }
        ],
        settingsItems
      ]
    }

    return [
      commonItems,
      [savedItems],
      settingsItems
    ]
  }

  const menuSections = getMenuItems()

  const adminItems: MenuItem[] = isAdmin ? [
    {
      icon: Shield,
      label: "Admin Dashboard",
      href: getLocalePath("/admin/dashboard"),
    },
    {
      icon: BarChart3,
      label: "Analytics",
      href: getLocalePath("/admin/analytics"),
    },
    {
      icon: Users,
      label: "Manage Users",
      href: getLocalePath("/admin/users"),
    },
    {
      icon: Briefcase,
      label: "Manage Jobs",
      href: getLocalePath("/admin/jobs"),
    }
  ] : []

  // Render star rating
  const renderRating = () => {
    if (totalReviews === 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <Star className="h-3 w-3" />
          <span>New on Open Job Market</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= Math.round(rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-500'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-1">
          {rating.toFixed(1)} ({totalReviews})
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Profile Header - Premium Dark */}
      <div className="bg-slate-800 px-4 py-5">
        {/* Profile Card - Clickable to Edit */}
        <Link href={getLocalePath(userType === 'company' ? '/company/profile/edit' : '/profile/edit')} className="block">
          <div className="flex items-start gap-4 hover:opacity-90 transition-opacity">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-slate-600">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-slate-700 text-white">
                  {userType === 'company' ? (
                    <Building2 className="h-8 w-8" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </AvatarFallback>
              </Avatar>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate">{displayName}</h1>
                {isVerified && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 truncate">{displayEmail}</p>

              {/* Rating */}
              <div className="mt-1">
                {renderRating()}
              </div>

              {/* Jobs completed (for professionals) */}
              {userType === 'professional' && jobsCompleted > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>{jobsCompleted} jobs completed</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRefresh()
              }}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </Link>

        {/* Toggles Section - Right after profile */}
        <div className="mt-4 space-y-2">
          {/* Profile Visibility Toggle */}
          <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5 border border-slate-600/50">
            <div className="flex items-center gap-2">
              {profileVisible ? (
                <Eye className="h-4 w-4 text-emerald-400" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {profileVisible ? 'Visible' : 'Hidden'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {profileVisible ? 'On map & search' : 'Not visible'}
                </p>
              </div>
            </div>
            <Switch
              checked={profileVisible}
              onCheckedChange={handleToggleVisibility}
              disabled={isTogglingVisibility}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {/* Instant Job Alerts Toggle (Company only) */}
          {userType === 'company' && (
            <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${instantJobAlerts ? 'text-purple-400' : 'text-slate-500'}`} />
                <div>
                  <p className="text-sm font-medium">
                    {instantJobAlerts ? 'AVAILABLE' : 'BUSY'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {instantJobAlerts ? 'Instant job notifications On' : 'Instant notifications Off'}
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-72 bg-slate-800 border-slate-700 text-white">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <p className="text-sm font-semibold">Instant Job Alerts</p>
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong>Works like Uber.</strong> When a nearby job matching your skills is posted, you receive an instant notification to apply or skip.
                      </p>
                      <div className="text-xs border-t border-slate-700 pt-2 mt-2 bg-purple-500/10 p-2 rounded">
                        <p className="font-medium text-purple-300">Be first to respond:</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-purple-200">
                          <li>Jobs matching your services</li>
                          <li>Within 10 miles of you</li>
                          <li>Instant push notification</li>
                        </ul>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Switch
                checked={instantJobAlerts}
                onCheckedChange={handleToggleInstantAlerts}
                disabled={isTogglingAlerts}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Menu Sections */}
      <div className="divide-y divide-slate-800/50">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="py-2">
            {section.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <div>
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <p className="text-xs text-slate-500">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge className={`${item.badgeColor} text-white text-xs px-2 py-0.5`}>
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        ))}

        {/* Admin Section */}
        {isAdmin && adminItems.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-purple-400 uppercase tracking-wide">
              Admin Tools
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-purple-400" />
                  <span className="font-medium text-purple-400">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Link>
            ))}
          </div>
        )}

        {/* Sign Out */}
        <div className="py-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-800 transition-colors text-red-500"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom spacing for mobile nav */}
      <div className="h-20 md:h-0" />
    </div>
  )
}
