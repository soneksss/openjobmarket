"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, MessageCircle, Plus, Bookmark, User, Map, Briefcase } from "lucide-react"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"
import dynamic from "next/dynamic"

const JobWizardModal = dynamic(() => import("@/components/job-wizard-modal"), { ssr: false })
const PostJobCategorySelector = dynamic(() => import("@/components/post-job-category-selector").then(m => ({ default: m.PostJobCategorySelector })), { ssr: false })

// Debounced sound — prevents double-play when multiple badge components fire simultaneously
function playGlobalMsgSound() {
  try {
    const w = window as any
    if (w.__lastMsgSound && Date.now() - w.__lastMsgSound < 800) return
    w.__lastMsgSound = Date.now()
    const Ctx = window.AudioContext || w.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tone = (freq: number, start: number, dur: number, vol = 0.25) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + dur)
    }
    tone(880, 0, 0.1, 0.28)
    tone(1100, 0.09, 0.14, 0.22)
  } catch { /* browser audio policy */ }
}

interface MobileBottomNavProps {
  user?: { id: string; user_metadata?: any } | null
  userType?: string | null
}

export function MobileBottomNav({ user: serverUser, userType: serverUserType }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useTranslation()
  const supabase = createClient()

  // Seed from server props so the nav renders immediately on first paint,
  // but always subscribe to SIGNED_OUT so account-deletion clears the nav
  // even when the server still had a valid cookie at render time.
  const [clientUser, setClientUser] = useState<{ id: string; user_metadata?: any } | null>(serverUser ?? null)
  const [clientUserType, setClientUserType] = useState<string | null>(serverUserType ?? null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setClientUser(null)
        setClientUserType(null)
      } else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user && !serverUser) {
        // Only fetch user type from DB when server didn't already resolve it
        const { data } = await supabase.from("users").select("user_type").eq("id", session.user.id).maybeSingle()
        setClientUser(session.user)
        setClientUserType(data?.user_type ?? session.user.user_metadata?.user_type ?? null)
      }
    })
    return () => { subscription.unsubscribe() }
  }, []) // run once — serverUser is captured in closure for the INITIAL_SESSION guard only

  const user = clientUser
  const userType = clientUserType
  const userId = user?.id

  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadJobNotifs, setUnreadJobNotifs] = useState(0)
  const [myJobsBadge, setMyJobsBadge] = useState(0)
  const [jobsSearchUrl, setJobsSearchUrl] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [homeownerProfile, setHomeownerProfile] = useState<any>(null)

  // Notification types homeowners receive about their jobs
  const HOMEOWNER_JOB_NOTIF_TYPES = ["job_application", "job_expiring"]

  const base = locale === "pt-BR" ? "/br" : ""

  // Fetch unread message count
  useEffect(() => {
    if (!userId) return

    const fetchMessages = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
      setUnreadMessages(count || 0)
    }

    fetchMessages()
    const intervalId = setInterval(fetchMessages, 10_000)

    // Re-fetch when tab regains focus (catches reads done on /messages page)
    const onFocus = () => fetchMessages()
    const onVisible = () => { if (document.visibilityState === "visible") fetchMessages() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)

    // Realtime: increment immediately on INSERT (no async lag), re-query on UPDATE
    const channel = supabase
      .channel(`mobile-nav-messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` }, (payload) => {
        // Only count if this message is truly for us (belt-and-suspenders for filter reliability)
        if ((payload.new as any)?.recipient_id !== userId) return
        setUnreadMessages(prev => prev + 1)
        // Play sound only when not already on the conversation page (which handles its own sounds)
        const isOnConversation = /\/messages\/[^/]+/.test(window.location.pathname)
        if (!isOnConversation) playGlobalMsgSound()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` }, fetchMessages)
      .subscribe()

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Fetch unread notification count (for tradesperson nav)
  useEffect(() => {
    if (!userId) return

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
      setUnreadNotifications(count || 0)
    }

    fetchNotifications()

    const channel = supabase
      .channel("mobile-nav-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchNotifications)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchNotifications)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchNotifications)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Fetch "My Jobs" badge count for tradespeople (new confirmed jobs not yet viewed)
  useEffect(() => {
    if (!userId || userType !== "company") return

    const fetchMyJobsBadge = async () => {
      const { data, error } = await supabase.rpc("get_my_jobs_badge_count")
      if (!error && typeof data === "number") setMyJobsBadge(data)
    }

    fetchMyJobsBadge()

    const onFocus = () => fetchMyJobsBadge()
    window.addEventListener("focus", onFocus)

    const channel = supabase
      .channel("mobile-nav-myjobs-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_applications" }, fetchMyJobsBadge)
      // Also re-fetch when a job's status changes (e.g. CONFIRMED → COMPLETED)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, fetchMyJobsBadge)
      .subscribe()

    return () => {
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channel)
    }
  }, [userId, userType])

  // Fetch unread JOB-RELATED notification count (homeowner "My Jobs" badge)
  useEffect(() => {
    if (!userId || userType !== "homeowner") return

    const fetchJobNotifs = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .in("type", HOMEOWNER_JOB_NOTIF_TYPES)
      setUnreadJobNotifs(count || 0)
    }

    fetchJobNotifs()

    const onFocus = () => fetchJobNotifs()
    const onVisible = () => { if (document.visibilityState === "visible") fetchJobNotifs() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)

    const channel = supabase
      .channel("mobile-nav-job-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchJobNotifs)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchJobNotifs)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchJobNotifs)
      .subscribe()

    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
      supabase.removeChannel(channel)
    }
  }, [userId, userType])

  // Fetch homeowner profile for the job wizard
  useEffect(() => {
    if (!userId || userType !== "homeowner") return
    supabase.from("homeowner_profiles").select("*").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setHomeownerProfile(data))
  }, [userId, userType])

  // Fetch tradesperson profile to build a personalised jobs search URL
  useEffect(() => {
    if (!userId) return
    const isTrade = serverUserType === "company" || clientUserType === "company"
    if (!isTrade) return

    // Use industry= + services= params (single ilike path) instead of skills= (slow multi-column ilike)
    const buildUrl = (lat: number | null, lng: number | null, industry: string | null, services: string[]) => {
      const params = new URLSearchParams()
      if (lat && lng) {
        params.set("lat", lat.toString())
        params.set("lng", lng.toString())
      }
      // "General" is a stale placeholder some profiles were seeded with — treat as no filter
      if (industry && industry !== "General") params.set("industry", industry)
      return `/find-jobs?${params.toString()}`
    }

    const effectiveUserType = userType
    if (effectiveUserType === "company") {
      // Company (tradesperson) → use company_profiles (industry + services)
      supabase.from("company_profiles")
        .select("industry, services, location, latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const services = Array.isArray(data.services) ? data.services.slice(0, 2) : []
            setJobsSearchUrl(buildUrl(data.latitude, data.longitude, data.industry, services))
          } else {
            // No lat/lng — let /find-jobs fall back to its own default + auto-geolocate
            setJobsSearchUrl("/find-jobs")
          }
        })
    } else {
      // Fallback — try professional_profiles for any legacy users
      supabase.from("professional_profiles")
        .select("title, skills, location, latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data: prof }) => {
          if (prof) {
            const services = Array.isArray(prof.skills) ? prof.skills.slice(0, 2) : []
            setJobsSearchUrl(buildUrl(prof.latitude, prof.longitude, prof.title, services))
          } else {
            // Fallback to company_profiles
            supabase.from("company_profiles")
              .select("industry, location, latitude, longitude")
              .eq("user_id", userId)
              .maybeSingle()
              .then(({ data: comp }) => {
                if (comp) {
                  setJobsSearchUrl(buildUrl(comp.latitude, comp.longitude, comp.industry, []))
                } else {
                  // No lat/lng — let /find-jobs fall back to its own default + auto-geolocate
                  setJobsSearchUrl("/find-jobs")
                }
              })
          }
        })
    }
  }, [userId, userType])

  // ── Guest nav (not logged in) ──────────────────────────────────────────────
  if (!user) {
    const guestItems: NavItem[] = [
      { key: "home",     icon: Home,          label: "Home",     href: `${base}/home`,       isActive: false },
      { key: "messages", icon: MessageCircle, label: "Messages", href: `${base}/auth/login`, isActive: false },
      { key: "post",     icon: Plus,          label: "Post Job", href: "#",                  isActive: false, isCenter: true, onClick: () => setShowCategorySelector(true) },
      { key: "myjobs",   icon: Briefcase,     label: "My Jobs",  href: `${base}/auth/login`, isActive: false },
      { key: "login",    icon: User,          label: "Log In",   href: `${base}/auth/login`, isActive: !!pathname?.includes("/auth/login") },
    ]
    return (
      <>
        <BottomNav items={guestItems} unreadMessages={0} unreadNotifications={0} />
        {showCategorySelector && (
          <PostJobCategorySelector onClose={() => setShowCategorySelector(false)} />
        )}
      </>
    )
  }

  const getDashboardUrl = () => {
    if (userType === "company") return `${base}/dashboard/company`
    if (userType === "homeowner") return `${base}/dashboard/homeowner`
    return `${base}/dashboard`
  }

  const isHomeowner = userType === "homeowner"
  const isTradesperson = userType === "company"

  // ── Homeowner nav ──────────────────────────────────────────────────────────
  if (isHomeowner) {
    const isOnMap = !!pathname?.startsWith("/find")
    const items = [
      { key: "home",     icon: Home,          label: "Home",     href: `${base}/home`,                     isActive: pathname?.startsWith("/home") },
      { key: "messages", icon: MessageCircle, label: "Messages", href: `${base}/messages`,                  isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
      { key: "post",     icon: Plus,          label: "Post Job", href: "#",                                 isActive: false, isCenter: true, onClick: () => setShowCategorySelector(true) },
      { key: "myjobs",   icon: Briefcase,     label: "My Jobs",  href: `${base}/dashboard/homeowner/jobs`, isActive: !!pathname?.includes("/dashboard/homeowner/jobs"), badge: unreadJobNotifs },
      { key: "account",  icon: User,          label: "Account",  href: `${base}/dashboard/homeowner`,      isActive: !!pathname?.includes("/dashboard/homeowner") && !pathname?.includes("/jobs") },
    ]
    return (
      <>
        <BottomNav items={items} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
        {showCategorySelector && (
          <PostJobCategorySelector onClose={() => setShowCategorySelector(false)} />
        )}
        {showWizard && (
          <div className="fixed inset-0" style={{ zIndex: 9999 }}>
            <JobWizardModal
              guestMode={!user}
              companyProfile={homeownerProfile ?? null}
              userType="homeowner"
              onClose={() => setShowWizard(false)}
            />
          </div>
        )}
      </>
    )
  }

  // ── Tradesperson nav ───────────────────────────────────────────────────────
  if (isTradesperson) {
    const defaultJobsUrl = "/find-jobs"
    const jobsUrl = `${base}${(jobsSearchUrl || defaultJobsUrl)}`
    const isOnJobsMap = !!pathname?.startsWith("/find-jobs") || !!pathname?.startsWith("/find")
    const items = [
      { key: "home",          icon: Home,          label: "Home",          href: `${base}/home`,          isActive: pathname?.startsWith("/home") },
      { key: "messages",      icon: MessageCircle, label: "Messages",      href: `${base}/messages`,      isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
      { key: "jobs",          icon: Map,           label: "Jobs",          href: jobsUrl,                 isActive: isOnJobsMap, isCenter: true, centerColor: "bg-orange-500 shadow-orange-500/30 hover:bg-orange-600" },
      { key: "myjobs",        icon: Briefcase,     label: "My Jobs",       href: `${base}/dashboard/company/my-jobs`, isActive: !!pathname?.includes("/dashboard/company/my-jobs"), badge: myJobsBadge },
      { key: "account",       icon: User,          label: "Account",       href: getDashboardUrl(),       isActive: !!pathname?.includes("/dashboard") && !pathname?.includes("/saved") },
    ]
    return <BottomNav items={items} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
  }

  // ── Fallback (unknown role) ────────────────────────────────────────────────
  const fallbackItems = [
    { key: "home",     icon: Home,          label: "Home",     href: `${base}/home`,     isActive: pathname?.startsWith("/home") },
    { key: "messages", icon: MessageCircle, label: "Messages", href: `${base}/messages`, isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
    { key: "account",  icon: User,          label: "Account",  href: getDashboardUrl(),  isActive: !!pathname?.includes("/dashboard") },
  ]
  return <BottomNav items={fallbackItems} unreadMessages={unreadMessages} unreadNotifications={0} />
}

// ── Shared renderer ────────────────────────────────────────────────────────────
interface NavItem {
  key: string
  icon: React.ElementType
  label: string
  href: string
  isActive: boolean
  isCenter?: boolean
  centerColor?: string
  badge?: number
  onClick?: () => void
}

function BottomNav({ items, unreadMessages, unreadNotifications }: { items: NavItem[], unreadMessages: number, unreadNotifications: number }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 border-t border-slate-700 pb-safe pl-safe pr-safe">
      <div className="flex justify-around items-center h-14 px-1">
        {items.map((item) => {
          const Icon = item.icon

          if (item.isCenter) {
            const centerInner = (
              <>
                <div className={`w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-lg transition-colors ${item.centerColor || "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600"}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] mt-0.5 text-slate-400 font-medium">{item.label}</span>
              </>
            )
            if (item.onClick) {
              return (
                <button key={item.key} onClick={item.onClick} className="flex flex-col items-center justify-center -mt-7">
                  {centerInner}
                </button>
              )
            }
            return (
              <Link key={item.key} href={item.href} className="flex flex-col items-center justify-center -mt-7">
                {centerInner}
              </Link>
            )
          }

          const badgeCount = item.badge || 0

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors relative ${
                item.isActive ? "text-emerald-400" : "text-slate-400 hover:text-emerald-400"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.isActive ? "stroke-[2.5]" : ""}`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${item.isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {item.isActive && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
