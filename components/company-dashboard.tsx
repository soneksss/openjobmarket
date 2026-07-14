"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  Edit,
  Plus,
  Users,
  TrendingUp,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  Search,
  Filter,
  BarChart3,
  Building2,
  Camera,
  Clock,
  AlertTriangle,
  Globe,
  Star,
  Info,
  Zap,
  X,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  XCircle,
  Pencil,
  Map,
  ClipboardList,
  LogOut,
  Settings,
  CreditCard,
  HelpCircle,
  History,
  CheckCircle2,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { manualLogout } from "@/hooks/use-auto-logout"
import pica from "pica"
import JobExpirationAlerts from "./job-expiration-alerts"
import { AdminButton } from "@/components/admin-button"
import { StarRating } from "@/components/star-rating"
import { useToast } from "@/hooks/use-toast"
import { useAvailableNow } from "@/contexts/available-now-context"
import { useTranslation } from "@/lib/i18n/context"
import { DashboardInbox } from "@/components/dashboard-inbox"
import { JobConfirmationModal, type ConfirmedJobOffer } from "@/components/job-confirmation-modal"
import { Progress } from "@/components/ui/progress"
import { MessageCircle, Bell } from "lucide-react"
import { MarkTradespersonJobsViewed } from "@/components/mark-tradesperson-jobs-viewed"
import { MarkJobCompleteButton } from "@/components/mark-job-complete-button"
import { ReviewHomeownerButton } from "@/components/review-homeowner-button"

// Helper to add cache-busting to logo URLs
const getLogoUrlWithCacheBust = (url: string | undefined) => {
  if (!url) return undefined
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}t=${Date.now()}`
}

interface User {
  id: string
  email: string
}

interface CompanyProfile {
  id: string
  company_name: string
  description: string
  industry: string
  services?: string[]
  website_url?: string
  location: string
  latitude?: number
  longitude?: number
  logo_url?: string
  profile_visible?: boolean
  open_for_business?: boolean
  availability_expires_at?: string | null
  is_hiring?: boolean
  trade_job_notifications?: boolean
  trade_job_notifications_distance?: number
  flexible_job_notifications?: boolean
  urgent_notifications_enabled?: boolean
  urgent_notifications_expires_at?: string | null
  flexible_notifications_enabled?: boolean
  founding_member?: boolean
}

interface Job {
  id: string
  title: string
  job_type: string
  work_location: string
  location: string
  is_active: boolean
  status: string
  is_tradespeople_job?: boolean
  applications_count: number
  views_count: number
  created_at: string
  expires_at?: string
  expiration_status?: string
  days_until_expiration?: number
  status_breakdown?: {
    pending: number
    reviewed: number
    interview: number
    accepted: number
    rejected: number
  }
}

interface ReceivedApplication {
  id: string
  status: string
  applied_at: string
  jobs: {
    id: string
    title: string
  }
  professional_profiles: {
    first_name: string
    last_name: string
    title: string
    location: string
    profile_photo_url?: string
    user_id?: string
  } | null
  company_profiles: {
    id: string
    company_name: string
    industry: string
    location: string
    logo_url?: string
    user_id?: string
  } | null
  applicant_type: "professional" | "company" | "unknown"
}

interface SubmittedApplication {
  id: string
  status: string
  applied_at: string
  job_id: string
  jobs: {
    id: string
    title: string
    location: string
    job_type: string
    is_tradespeople_job: boolean
  }
  job_poster_name: string
  job_poster_avatar: string | null
}

interface Stats {
  totalApplications: number
  activeJobs: number
  totalJobs: number
}

interface Rating {
  average_rating: number
  total_reviews: number
}

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  is_edited: boolean
  reviewer_id: string
  reviewer_name: string
  reviewer_avatar: string | null
}

interface CompanyDashboardProps {
  user: User
  profile: CompanyProfile
  jobs: Job[]
  receivedApplications: ReceivedApplication[]
  submittedApplications: SubmittedApplication[]
  myJobs?: any[]
  stats: Stats
  rating: Rating
  reviews: Review[]
  isProfileComplete?: boolean
  missingFields?: string[]
}

// Helper to get human-readable field names
const getFieldDisplayName = (field: string): string => {
  const fieldNames: Record<string, string> = {
    company_name: "Company Name",
    industry: "Industry",
    location: "Location",
  }
  return fieldNames[field] || field
}

export default function CompanyDashboard({ user, profile, jobs, receivedApplications, submittedApplications, myJobs = [], stats, rating, reviews, isProfileComplete = true, missingFields = [] }: CompanyDashboardProps) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [profileVisible, setProfileVisible] = useState(profile.profile_visible ?? true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [hiring, setHiring] = useState(profile.is_hiring ?? false)
  const [updatingHiringStatus, setUpdatingHiringStatus] = useState(false)
  // Urgent jobs: available for 24h active window — shared with the header/map
  // toggle via context so both stay mirrored without a page refresh.
  const { enabled: urgentEnabled, saving: updatingUrgent, toggle: setAvailableNow } = useAvailableNow()
  // Flexible jobs: always-optional notifications
  const [flexibleEnabled, setFlexibleEnabled] = useState(profile.flexible_notifications_enabled ?? true)
  const [updatingFlexible, setUpdatingFlexible] = useState(false)
  const [tradeNotificationDistance, setTradeNotificationDistance] = useState<number>(
    profile.trade_job_notifications_distance ?? 10
  )
  // slider live value (updates on every drag tick; saved on mouse-up / touch-end)
  const [sliderValue, setSliderValue] = useState<number>(
    profile.trade_job_notifications_distance ?? 10
  )
  const [updatingDistance, setUpdatingDistance] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [isApplicationsExpanded, setIsApplicationsExpanded] = useState(false)
  const [myJobsTab, setMyJobsTab] = useState<"active" | "history">("active")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // New state for success signals
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [profileViewsWeekly, setProfileViewsWeekly] = useState(0)

  // ── Job-confirmation offer (state machine) ─────────────────
  // Shown as a full-screen modal when a homeowner confirms this
  // tradesperson for a job. Never updated via direct DB write —
  // the tradesperson must call accept_confirmed_job() RPC.
  const [pendingOffer, setPendingOffer] = useState<ConfirmedJobOffer | null>(null)

  const supabase = createClient()

  // Calculate profile completion percentage
  const profileCompletionFields = ['company_name', 'industry', 'location', 'description', 'logo_url', 'services', 'website_url']
  const completedFields = profileCompletionFields.filter(field => {
    const value = profile[field as keyof CompanyProfile]
    if (Array.isArray(value)) return value.length > 0
    return !!value
  })
  const profileCompletionPercent = Math.round((completedFields.length / profileCompletionFields.length) * 100)

  // Confirmed jobs: accepted by homeowner
  const confirmedJobs = useMemo(() => {
    return submittedApplications.filter(app => app.status === 'accepted')
  }, [submittedApplications])

  // Awaiting homeowner response: still in progress
  const awaitingResponseJobs = useMemo(() => {
    return submittedApplications.filter(app =>
      app.status === 'pending' || app.status === 'reviewed' || app.status === 'interview'
    )
  }, [submittedApplications])

  // Combined for backward compat (mobile counter etc.)
  const activeJobApplications = useMemo(() => [...confirmedJobs, ...awaitingResponseJobs], [confirmedJobs, awaitingResponseJobs])

  // Browse Jobs URL — sends tradesperson to the dedicated /find-jobs map
  // (same destination as the "Jobs" bottom-nav button) centred on their area
  const browseJobsUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (profile.latitude != null && profile.longitude != null) {
      params.set('lat', String(profile.latitude))
      params.set('lng', String(profile.longitude))
    }
    if (profile.industry) {
      params.set('industry', profile.industry)
    }
    const qs = params.toString()
    return qs ? `/find-jobs?${qs}` : '/find-jobs'
  }, [profile.latitude, profile.longitude, profile.industry])

  // Log dashboard open as activity event (drives freshness score)
  useEffect(() => {
    Promise.resolve(supabase.rpc("log_company_activity", { p_activity_type: "dashboard_open" })).catch(() => {})
  }, [])

  // Expiry guard now lives in AvailableNowProvider (shared with the header/map
  // toggle), so it only needs to run once regardless of how many places show this.

  // Fetch unread messages count
  useEffect(() => {
    const fetchCounts = async () => {
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      setUnreadMessagesCount(unreadCount ?? 0)
    }

    fetchCounts()

    // Subscribe to realtime inserts so the badge updates without a page refresh
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user.id, supabase])

  // ── Realtime: watch for job confirmations ─────────────────
  // Rule: never update jobs.status from the frontend.
  // Instead, listen for CONFIRMED status on jobs where
  // confirmed_tradesperson_id = this tradesperson's profile.
  useEffect(() => {
    if (!profile?.id) return

    // On mount: check for any already-confirmed job still within the 24h window
    const checkExisting = async () => {
      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("jobs")
        .select("id, title, confirmed_at, homeowner_id, budget_min, budget_max, budget_period, location")
        .eq("confirmed_tradesperson_id", profile.id)
        .eq("status", "CONFIRMED")
        .gt("confirmed_at", windowStart)
        .order("confirmed_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        // Also fetch the application_id so the Decline button can call the API
        const { data: app } = await supabase
          .from("job_applications")
          .select("id")
          .eq("job_id", data.id)
          .eq("company_id", profile.id)
          .maybeSingle()
        setPendingOffer({ ...(data as ConfirmedJobOffer), application_id: app?.id ?? null })
      }
    }
    checkExisting()

    // Live: react when any job transitions to CONFIRMED for this tradesperson
    const channel = supabase
      .channel(`job-offer-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `confirmed_tradesperson_id=eq.${profile.id}`,
        },
        async (payload) => {
          const job = payload.new as any
          if (job.status === "CONFIRMED") {
            const { data: app } = await supabase
              .from("job_applications")
              .select("id")
              .eq("job_id", job.id)
              .eq("company_id", profile.id)
              .maybeSingle()
            setPendingOffer({
              id:            job.id,
              title:         job.title,
              confirmed_at:  job.confirmed_at,
              homeowner_id:  job.homeowner_id,
              budget_min:    job.budget_min ?? null,
              budget_max:    job.budget_max ?? null,
              budget_period: job.budget_period ?? null,
              location:      job.location ?? null,
              application_id: app?.id ?? null,
            })
          } else {
            // Job moved away from CONFIRMED (accepted/cancelled) — clear modal
            setPendingOffer((prev) => (prev?.id === job.id ? null : prev))
            // Job became COMPLETED — refresh server data so myJobs moves to history
            if (job.status === "COMPLETED") {
              router.refresh()
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Use state for cache-busted logo URL to avoid SSR hydration mismatch
  // Initialize with original URL, then add cache bust on client only
  const [logoUrlWithCacheBust, setLogoUrlWithCacheBust] = useState(profile.logo_url)

  useEffect(() => {
    // Only add cache bust on client side to avoid hydration mismatch
    if (profile.logo_url) {
      setLogoUrlWithCacheBust(getLogoUrlWithCacheBust(profile.logo_url))
    }
  }, [profile.logo_url])

  // Handle withdraw application
  const handleWithdrawApplication = async (applicationId: string, jobTitle: string) => {
    if (!confirm(`Withdraw your application for "${jobTitle}"? This cannot be undone.`)) {
      return
    }

    setActionLoading(applicationId)
    try {
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", applicationId)

      if (error) throw error

      toast({
        title: "Application Withdrawn",
        description: `Your application for "${jobTitle}" has been withdrawn.`,
      })

      router.refresh()
    } catch (error: any) {
      console.error("[COMPANY-DASHBOARD] Error withdrawing application:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getJobStatusBadge = (job: Job) => {
    // Priority 1: Check expiration status
    if (job.expiration_status === "expired") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('common.expired')}
        </Badge>
      )
    } else if (job.expiration_status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expires in {job.days_until_expiration} day{job.days_until_expiration === 1 ? "" : "s"}
        </Badge>
      )
    }

    // Priority 2: Check job status (draft, open, accepted, etc.)
    if (job.status === 'draft') {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
          Draft
        </Badge>
      )
    } else if (job.status === 'open' && job.is_active) {
      return <Badge variant="default">{t('common.active')}</Badge>
    } else if (job.status === 'open' && !job.is_active) {
      return <Badge variant="secondary">{t('common.inactive')}</Badge>
    } else if (job.status === 'accepted') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          Accepted
        </Badge>
      )
    } else if (job.status === 'in_progress') {
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
          In Progress
        </Badge>
      )
    } else if (job.status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          Completed
        </Badge>
      )
    } else if (job.status === 'failed') {
      return (
        <Badge variant="destructive">
          Failed
        </Badge>
      )
    } else {
      // Fallback to is_active if status is unknown
      return job.is_active ? (
        <Badge variant="default">{t('common.active')}</Badge>
      ) : (
        <Badge variant="secondary">{t('common.inactive')}</Badge>
      )
    }
  }

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ])
  }

  // Image resizing helper function
  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    console.log("[v0] [resizeImage] Starting resize for:", file.name, "Type:", file.type)
    return new Promise((resolve, reject) => {
      // Add overall timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.error("[v0] [resizeImage] Overall timeout reached")
        reject(new Error("IMAGE_PROCESSING_TIMEOUT: Image processing took too long"))
      }, 30000) // 30 second overall timeout

      const img = new window.Image()
      img.onload = async () => {
        console.log("[v0] [resizeImage] Image loaded successfully. Dimensions:", img.width, "x", img.height)
        try {
          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            console.error("[v0] [resizeImage] Invalid dimensions:", img.width, img.height)
            clearTimeout(timeoutId)
            reject(new Error("IMAGE_DIMENSIONS_INVALID: Image has invalid dimensions"))
            return
          }

          // Check if image is too large to process
          if (img.width > 10000 || img.height > 10000) {
            console.error("[v0] [resizeImage] Image too large:", img.width, img.height)
            clearTimeout(timeoutId)
            reject(new Error("IMAGE_TOO_LARGE: Image dimensions exceed 10000x10000 pixels"))
            return
          }

          const canvas = document.createElement("canvas")
          console.log("[v0] [resizeImage] Canvas created")

          // Create square image for circular logo display
          // Calculate crop dimensions to get a square from the center
          const size = Math.min(img.width, img.height)
          const cropX = (img.width - size) / 2
          const cropY = (img.height - size) / 2

          // Set canvas to square dimensions
          canvas.width = maxSize
          canvas.height = maxSize
          console.log("[v0] [resizeImage] Target dimensions:", maxSize, "x", maxSize, "(square)")
          console.log("[v0] [resizeImage] Cropping from center:", { cropX, cropY, size })

          let blob: Blob | null = null
          let usedNativeFallback = false

          // Try using pica for high-quality resizing first (with timeout)
          try {
            console.log("[v0] [resizeImage] Starting pica resize...")
            const picaInstance = pica()

            // Create a temporary canvas with the cropped square from the original image
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = size
            tempCanvas.height = size
            const tempCtx = tempCanvas.getContext("2d")
            if (!tempCtx) {
              throw new Error("Failed to get temp canvas context")
            }

            // Draw the cropped square portion
            tempCtx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size)
            console.log("[v0] [resizeImage] Cropped source canvas created")

            // Resize the cropped square to the target size (with 10 second timeout)
            await withTimeout(
              picaInstance.resize(tempCanvas, canvas),
              10000,
              "Pica resize timeout"
            )
            console.log("[v0] [resizeImage] Pica resize completed")

            // Convert to WebP for better compression (with 5 second timeout)
            console.log("[v0] [resizeImage] Converting to WebP...")
            blob = await withTimeout(
              picaInstance.toBlob(canvas, "image/webp", 0.85),
              5000,
              "Pica toBlob timeout"
            )
            console.log("[v0] [resizeImage] WebP conversion completed. Blob size:", blob?.size || 0)
          } catch (picaError) {
            console.warn("[v0] [resizeImage] Pica failed, falling back to native canvas:", picaError)
            usedNativeFallback = true

            // Fallback to native canvas resizing
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              clearTimeout(timeoutId)
              reject(new Error("IMAGE_PROCESSING_FAILED: Failed to get canvas context"))
              return
            }

            // Use native canvas drawing with crop parameters (works with fingerprinting protection)
            // drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight)
            ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
            console.log("[v0] [resizeImage] Native canvas resize completed with center crop")

            // Convert to WebP using canvas.toBlob
            blob = await new Promise<Blob | null>((blobResolve) => {
              canvas.toBlob(blobResolve, "image/webp", 0.85)
            })
            console.log("[v0] [resizeImage] Native WebP conversion completed. Blob size:", blob?.size || 0)
          }

          if (!blob || blob.size === 0) {
            console.error("[v0] [resizeImage] Blob creation failed")
            clearTimeout(timeoutId)
            reject(new Error("IMAGE_CONVERSION_FAILED: Failed to convert image to WebP format"))
            return
          }

          const resizedFile = new File([blob], "logo.webp", { type: "image/webp" })
          console.log("[v0] [resizeImage] Resized file created successfully", usedNativeFallback ? "(using native fallback)" : "(using pica)")

          URL.revokeObjectURL(img.src)
          clearTimeout(timeoutId)
          resolve(resizedFile)
        } catch (error) {
          console.error("[v0] [resizeImage] Error during processing:", error)
          URL.revokeObjectURL(img.src)
          clearTimeout(timeoutId)
          if (error instanceof Error) {
            reject(error)
          } else {
            reject(new Error("IMAGE_PROCESSING_FAILED: Unknown error during image processing"))
          }
        }
      }
      img.onerror = (event) => {
        console.error("[v0] [resizeImage] Image load failed:", event)
        URL.revokeObjectURL(img.src)
        clearTimeout(timeoutId)
        reject(new Error("IMAGE_LOAD_FAILED: Unable to load image. The file may be corrupted or in an unsupported format"))
      }
      const objectUrl = URL.createObjectURL(file)
      console.log("[v0] [resizeImage] Object URL created:", objectUrl)
      img.src = objectUrl
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check browser support for required APIs
    if (typeof window === 'undefined' || !window.Image) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the required image processing features. Please use a modern browser like Chrome, Firefox, Edge, or Safari.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a valid image file. Supported formats: JPEG, PNG, GIF, WebP. You selected: ${file.type || 'Unknown type'}`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Original file size validation (10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `The file size is ${(file.size / 1024 / 1024).toFixed(2)}MB, which exceeds the 10MB limit. Please compress the image or use a smaller file.`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    setUploadingLogo(true)
    try {
      const supabase = createClient()
      console.log("[v0] Starting logo upload and resize for file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2) + "MB")

      console.log("[v0] About to call resizeImage...")
      // Resize and optimize the image
      const resizedFile = await resizeImage(file, 300)
      console.log("[v0] resizeImage completed successfully")
      console.log("[v0] Image resized:", "New size:", (resizedFile.size / 1024).toFixed(2) + "KB")

      const fileName = `${user.id}/logo.webp`

      // Delete old logo if exists
      if (profile.logo_url) {
        try {
          const oldPath = profile.logo_url.split('/').slice(-2).join('/') // Get user_id/filename
          console.log("[v0] Attempting to delete old logo:", oldPath)
          await supabase.storage.from("company-logos").remove([oldPath])
        } catch (deleteError) {
          console.warn("[v0] Could not delete old logo:", deleteError)
          // Continue with upload even if deletion fails
        }
      }

      // Upload resized logo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, resizedFile, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting if file exists
        })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)

        // Provide more specific error messages
        if (uploadError.message.includes('bucket')) {
          toast({
            title: "Storage Error",
            description: "Storage bucket not configured. Please contact support.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (uploadError.message.includes('policy')) {
          toast({
            title: "Permission Denied",
            description: "Please ensure you're logged in and try again.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Upload Failed",
            description: `Error uploading logo: ${uploadError.message}`,
            variant: "destructive",
            duration: 5000,
          })
        }
        return
      }

      console.log("[v0] Upload successful:", uploadData)

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("company-logos").getPublicUrl(fileName)

      console.log("[v0] Public URL generated:", publicUrl)

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from("company_profiles")
        .update({ logo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        console.error("[v0] Error updating profile with logo URL:", updateError)
        toast({
          title: "Update Failed",
          description: "Logo uploaded but failed to update profile. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      console.log("[v0] Logo upload completed successfully!")

      // Show success toast
      toast({
        title: "✓ Logo Updated Successfully",
        description: "Your profile logo has been updated. The page will reload to show the changes.",
        duration: 2000,
      })

      // Refresh the page to show the new logo (after a short delay for the toast)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("[v0] Unexpected error:", error)

      if (error instanceof Error) {
        const errorMessage = error.message

        // Parse custom error codes from resizeImage
        if (errorMessage.includes('IMAGE_LOAD_FAILED')) {
          toast({
            title: "Failed to Load Image",
            description: "The image file could not be loaded. The file may be corrupted or in an unsupported format. Try using a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_DIMENSIONS_INVALID')) {
          toast({
            title: "Invalid Image Dimensions",
            description: "The image has invalid or zero dimensions. Please choose a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_TOO_LARGE')) {
          toast({
            title: "Image Too Large",
            description: "The image dimensions exceed 10,000x10,000 pixels. Please resize the image to smaller dimensions (e.g., 2000x2000 or less).",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_CONVERSION_FAILED')) {
          toast({
            title: "Image Conversion Failed",
            description: "Failed to convert your image to WebP format. Try using a different browser (Chrome or Edge recommended) or a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_PROCESSING_TIMEOUT')) {
          toast({
            title: "Image Processing Timeout",
            description: "The image took too long to process. Please try a smaller image file (under 2MB recommended) or try again.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_PROCESSING_FAILED')) {
          toast({
            title: "Image Processing Failed",
            description: "An error occurred while processing your image. Try using a smaller image file or closing other browser tabs to free up memory.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('canvas')) {
          toast({
            title: "Canvas Processing Error",
            description: "Your browser encountered an error while processing the image. Try using a different browser (Chrome or Edge work best).",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
          toast({
            title: "Memory Error",
            description: "Your browser ran out of memory while processing the image. Try using a smaller image file or closing other browser tabs.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Upload Error",
            description: `${errorMessage}. If this problem persists, try using a different image file or browser.`,
            variant: "destructive",
            duration: 5000,
          })
        }
      } else {
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred while uploading your logo. Please try again with a different image file.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setUploadingLogo(false)
      // Reset the file input so the same file can be selected again
      const fileInputs = document.querySelectorAll<HTMLInputElement>('#logo-upload, #logo-upload-desktop')
      fileInputs.forEach(input => {
        if (input) input.value = ''
      })
    }
  }

  const handleVisibilityToggle = async (visible: boolean) => {
    setUpdatingVisibility(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("company_profiles")
        .update({ profile_visible: visible })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating company visibility:", error.message)
        if (error.message.includes("column") && error.message.includes("profile_visible")) {
          console.log("[v0] Company visibility feature not yet available - database migration needed")
          toast({
            title: "Feature Unavailable",
            description: "Company visibility feature will be available soon. Database migration required.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Update Failed",
            description: `Error updating visibility: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          })
        }
        return
      }

      setProfileVisible(visible)
      console.log("[v0] Company visibility updated successfully:", visible)
    } catch (error) {
      console.error("[v0] Error updating company visibility:", error)
      toast({
        title: "Update Failed",
        description: "Error updating visibility. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const handleUrgentToggle = async (enabled: boolean) => {
    await setAvailableNow(enabled)
    if (enabled) {
      toast({ title: "Available now", description: "You'll receive urgent job alerts for the next 24 hours.", duration: 3000 })
    }
  }

  const handleFlexibleToggle = async (enabled: boolean) => {
    setFlexibleEnabled(enabled)
    setUpdatingFlexible(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("company_profiles")
        .update({
          flexible_notifications_enabled: enabled,
          trade_job_notifications:        enabled,
          flexible_job_notifications:     enabled,
        })
        .eq("id", profile.id)

      if (error) {
        setFlexibleEnabled(!enabled)
        toast({ title: "Update Failed", description: error.message, variant: "destructive", duration: 5000 })
      }
    } catch {
      setFlexibleEnabled(!enabled)
      toast({ title: "Update Failed", description: "Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setUpdatingFlexible(false)
    }
  }

  const handleHiringStatusToggle = async (status: boolean) => {
    // Update UI immediately
    setHiring(status)
    setUpdatingHiringStatus(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("company_profiles")
        .update({ is_hiring: status })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating hiring status:", error.message)
        if (error.message.includes("column") && error.message.includes("is_hiring")) {
          console.log("[v0] Hiring status feature not yet available - database migration needed")
          // Column doesn't exist yet, but keep UI updated
        } else {
          toast({
            title: "Update Failed",
            description: `Error updating hiring status: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          })
          // Revert on actual error
          setHiring(!status)
        }
        return
      }

      console.log("[v0] Hiring status updated successfully:", status)
    } catch (error) {
      console.error("[v0] Error updating hiring status:", error)
      toast({
        title: "Update Failed",
        description: "Error updating hiring status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      setHiring(!status) // Revert on error
    } finally {
      setUpdatingHiringStatus(false)
    }
  }

  // Master toggle: turns both alert types on (restoring both) or off (disabling both)

  // Slider: update live display on every tick; save to DB only on release
  const handleDistanceCommit = async (miles: number) => {
    const prev = tradeNotificationDistance
    setTradeNotificationDistance(miles)
    setUpdatingDistance(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("company_profiles")
        .update({ trade_job_notifications_distance: miles })
        .eq("id", profile.id)
      if (error) {
        setTradeNotificationDistance(prev)
        setSliderValue(prev)
        toast({ title: "Update Failed", description: error.message, variant: "destructive", duration: 5000 })
      }
    } catch {
      setTradeNotificationDistance(prev)
      setSliderValue(prev)
      toast({ title: "Update Failed", description: "Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setUpdatingDistance(false)
    }
  }

  const pendingApplicationsCount = receivedApplications.filter(a => a.status === 'pending').length

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()}–£${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const formatJobDate = (d?: string) => {
    if (!d) return null
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  const activeMyJobs = myJobs.filter(j => j.status === "CONFIRMED" || j.status === "ACTIVE")
  const historyMyJobs = myJobs.filter(j => j.status === "COMPLETED")
  const displayedMyJobs = myJobsTab === "active" ? activeMyJobs : historyMyJobs

  return (
    <>
      {/* ── Job-confirmation offer modal ────────────────────────
          Shown full-screen when a homeowner confirms this tradesperson.
          Tradesperson must call accept_confirmed_job() RPC via the modal;
          the frontend never writes jobs.status directly.             */}
      {pendingOffer && (
        <JobConfirmationModal
          job={pendingOffer}
          onAccepted={() => setPendingOffer(null)}
          onDismiss={() => setPendingOffer(null)}
        />
      )}

      {/* Mobile: SpareRoom-style Account Page */}
      <div className="md:hidden min-h-screen bg-slate-900 text-white">
        {/* Profile Header */}
        <div className="bg-slate-800 px-4 py-5">
          <div className="flex items-center gap-4">
            <Link href="/company/profile/edit" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <Avatar className="h-16 w-16 border-2 border-slate-600">
                <AvatarImage src={profile.logo_url} className="object-cover" />
                <AvatarFallback className="bg-slate-700 text-white">
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href="/company/profile/edit" className="block hover:opacity-80 transition-opacity">
                <p className="text-lg font-bold truncate">{profile.company_name}</p>
                <p className="text-sm text-slate-400 truncate">{user.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">{profile.industry}</p>
              </Link>
              {/* Stars — tappable, directly under company info */}
              <button
                onClick={() => setShowReviewsModal(true)}
                className="mt-1.5 flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1 active:bg-amber-500/25 transition-colors"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= Math.round(rating.average_rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-amber-400">
                  {rating.total_reviews > 0
                    ? `${rating.average_rating.toFixed(1)} (${rating.total_reviews} review${rating.total_reviews !== 1 ? "s" : ""})`
                    : "No reviews yet"}
                </span>
              </button>
            </div>
            <Link href="/company/profile/edit" className="flex-shrink-0">
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </Link>
          </div>

          {/* Toggles */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5 border border-slate-600/50">
              <div className="flex items-center gap-2">
                {profileVisible ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
                <div>
                  <p className="text-sm font-medium">{profileVisible ? 'Visible' : 'Hidden'}</p>
                  <p className="text-[10px] text-slate-400">{profileVisible ? 'On map & search' : 'Not visible'}</p>
                </div>
              </div>
              <Switch checked={profileVisible} onCheckedChange={handleVisibilityToggle} disabled={updatingVisibility} className="data-[state=checked]:bg-emerald-500" />
            </div>
            {/* Job Notifications — unified card */}
            <div className="bg-slate-700/50 rounded-xl px-3 py-2.5 border border-purple-500/30 space-y-2.5">
              {/* Flexible toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className={`h-4 w-4 ${flexibleEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{flexibleEnabled ? 'Job alerts on' : 'Job alerts off'}</p>
                    <p className="text-[10px] text-slate-400">Flexible job notifications</p>
                  </div>
                </div>
                <Switch checked={flexibleEnabled} onCheckedChange={handleFlexibleToggle} disabled={updatingFlexible} className="data-[state=checked]:bg-purple-500" />
              </div>

              {/* Distance slider — applies to both flexible and urgent */}
              <div className={`space-y-1 ${updatingDistance ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Notification distance (flexible &amp; urgent)</span>
                  <span className="text-[10px] font-semibold text-purple-300">{sliderValue} miles</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={sliderValue}
                  onChange={e => setSliderValue(Number(e.target.value))}
                  onMouseUp={e => handleDistanceCommit(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={e => handleDistanceCommit(Number((e.target as HTMLInputElement).value))}
                  className="w-full h-1.5 rounded-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="border-t border-slate-600/50" />

              {/* Urgent toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${urgentEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{urgentEnabled ? 'Available now' : 'Not available'}</p>
                    <p className="text-[10px] text-slate-400">Turn on when ready to work now</p>
                  </div>
                </div>
                <Switch checked={urgentEnabled} onCheckedChange={handleUrgentToggle} disabled={updatingUrgent} className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600" />
              </div>
              {urgentEnabled && (
                <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                  <Clock className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300 leading-snug">
                    Resets to Busy at 9:00 AM the next day. You'll get a push notification to re-confirm.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="divide-y divide-slate-800">
          {/* Main Actions */}
          <div className="py-1">
            {[
              { icon: Map,          label: 'Browse Trade Jobs', href: browseJobsUrl,                          count: undefined },
              { icon: Briefcase,    label: 'My Jobs',           href: '/dashboard/company/my-jobs',           count: confirmedJobs.length > 0 ? confirmedJobs.length : undefined },
              { icon: BarChart3,    label: 'Statistics',        href: '/dashboard/company/statistics',         count: undefined },
              { icon: MessageCircle,label: 'Messages',          href: '/messages',                             count: unreadMessagesCount > 0 ? unreadMessagesCount : undefined },
            ].map(item => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && item.count > 0 && (
                    <span className="bg-purple-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>

          {/* Profile & Billing */}
          <div className="py-1">
            {[
              { icon: Building2, label: 'Edit Company Profile', href: '/company/profile/edit' },
              { icon: CreditCard, label: 'Membership', href: '/dashboard/company/subscription' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Link>
            ))}
          </div>

          {/* Support & Settings */}
          <div className="py-1">
            {[
              { icon: Settings, label: 'Account Settings', href: '/account/settings' },
              { icon: HelpCircle, label: 'Get Support', href: '/help' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          <div className="py-1">
            <button
              onClick={manualLogout}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-slate-800 transition-colors text-red-400"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Bottom spacing for mobile nav */}
        <div className="h-20" />
      </div>

      {/* Desktop: Full Dashboard - Premium Dark Theme */}
      <div className="hidden md:block min-h-screen bg-slate-900 text-white">
      {/* Incomplete Profile Banner - Dark Theme */}
      {!isProfileComplete && missingFields.length > 0 && (
        <div className="bg-amber-500/20 border-b border-amber-500/30">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-300">
                    Complete your company profile to unlock all features
                  </p>
                  <p className="text-sm text-amber-400/80 mt-0.5">
                    Missing: {missingFields.map(f => getFieldDisplayName(f)).join(", ")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                asChild
              >
                <Link href="/company/profile/edit">
                  Complete Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-1.5 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Company Profile Section - Order 1 on mobile */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="p-3 sm:p-4 relative">
                {/* Edit Button - Top Right Corner - Hidden on mobile, visible on desktop */}
                <div className="hidden lg:flex absolute -top-1 right-2 gap-1 z-20">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9 bg-slate-700 border-slate-600 hover:bg-slate-600 shadow-sm"
                  >
                    <Link href="/company/profile/edit">
                      <Edit className="h-4 w-4 sm:h-4 sm:w-4 text-slate-300" />
                    </Link>
                  </Button>
                </div>

                {/* Desktop Layout: Original layout - Dark Theme */}
                <div className="hidden lg:flex items-start gap-3 mb-3 sm:mb-2">
                  <div className="relative flex-shrink-0">
                    <Link href="/company/profile/edit" className="block hover:opacity-80 transition-opacity">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-700 rounded-full overflow-hidden border-2 border-slate-600 flex items-center justify-center cursor-pointer">
                        {profile.logo_url ? (
                          <Image
                            src={logoUrlWithCacheBust || profile.logo_url}
                            alt={`${profile.company_name} logo`}
                            width={80}
                            height={80}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="text-xl sm:text-2xl font-medium text-slate-400">
                            {profile.company_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="absolute -bottom-1 -right-1">
                      <Label htmlFor="logo-upload-desktop" className="cursor-pointer">
                        <div className="bg-emerald-500 text-white rounded-full p-1 hover:bg-emerald-600 transition-colors">
                          <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </div>
                      </Label>
                      <Input
                        id="logo-upload-desktop"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </div>
                  </div>

                  {/* Company Info - Center */}
                  <div className="flex-1 min-w-0">
                    {/* Company Name - 50% larger (clickable to edit profile) */}
                    <Link href="/company/profile/edit" className="block hover:opacity-80 transition-opacity">
                      <h2 className="text-xl sm:text-2xl font-bold text-white break-words mb-0.5 leading-tight cursor-pointer flex items-center gap-2 flex-wrap">
                        {profile.company_name}
                        {profile.founding_member && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full align-middle">
                            <Trophy className="h-3 w-3" />Founding Member
                          </span>
                        )}
                      </h2>
                    </Link>

                    {/* Star Rating */}
                    <div
                      className="mb-1 cursor-pointer hover:opacity-80 transition-opacity inline-block"
                      onClick={() => setShowReviewsModal(true)}
                      title="Click to view reviews"
                    >
                      <StarRating
                        rating={rating.average_rating}
                        totalReviews={rating.total_reviews}
                        size="sm"
                        showCount={true}
                      />
                    </div>

                    {/* Industry - 30% larger */}
                    <p className="text-sm sm:text-base text-slate-400 break-words">{profile.industry}</p>
                  </div>
                </div>

                {/* Toggles Section - Desktop */}
                <div className="hidden lg:block space-y-2 pt-3 mt-3 border-t border-slate-700">
                  {/* Profile Visibility */}
                  <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5 border border-slate-600/50">
                    <div className="flex items-center gap-2">
                      {profileVisible ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
                      <div>
                        <p className="text-sm font-medium text-white">{profileVisible ? 'Visible' : 'Hidden'}</p>
                        <p className="text-[10px] text-slate-400">{profileVisible ? 'On map & search' : 'Not visible'}</p>
                      </div>
                    </div>
                    <Switch checked={profileVisible} onCheckedChange={handleVisibilityToggle} disabled={updatingVisibility} className="data-[state=checked]:bg-emerald-500" />
                  </div>

                  {/* Job Notifications — unified card */}
                  <div className="bg-slate-700/50 rounded-xl px-3 py-2.5 border border-purple-500/30 space-y-2.5">
                    {/* Flexible toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className={`h-4 w-4 ${flexibleEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{flexibleEnabled ? 'Job alerts on' : 'Job alerts off'}</p>
                          <p className="text-[10px] text-slate-400">Flexible job notifications</p>
                        </div>
                      </div>
                      <Switch checked={flexibleEnabled} onCheckedChange={handleFlexibleToggle} disabled={updatingFlexible} className="data-[state=checked]:bg-purple-500" />
                    </div>

                    {/* Distance slider — applies to both flexible and urgent */}
                    <div className={`space-y-1 ${updatingDistance ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Notification distance (flexible &amp; urgent)</span>
                        <span className="text-[10px] font-semibold text-purple-300">{sliderValue} miles</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={sliderValue}
                        onChange={e => setSliderValue(Number(e.target.value))}
                        onMouseUp={e => handleDistanceCommit(Number((e.target as HTMLInputElement).value))}
                        onTouchEnd={e => handleDistanceCommit(Number((e.target as HTMLInputElement).value))}
                        className="w-full h-1.5 rounded-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div className="border-t border-slate-600/50" />

                    {/* Urgent toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`h-4 w-4 ${urgentEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{urgentEnabled ? 'Available now' : 'Not available'}</p>
                          <p className="text-[10px] text-slate-400">Turn on when ready to work now</p>
                        </div>
                      </div>
                      <Switch checked={urgentEnabled} onCheckedChange={handleUrgentToggle} disabled={updatingUrgent} className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600" />
                    </div>
                    {urgentEnabled && (
                      <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                        <Clock className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-300 leading-snug">
                          Resets to Busy at 9:00 AM the next day. You'll get a push notification to re-confirm.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="hidden lg:block space-y-0.5 sm:space-y-1 p-2 sm:p-6 pt-1">
                {profile.location && (
                  <div className="flex items-center text-[9px] sm:text-xs text-slate-400">
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}

                {profile.description && (
                  <p className="text-[10px] sm:text-sm text-slate-300 line-clamp-2 sm:line-clamp-3 hidden sm:block">{profile.description}</p>
                )}

                {profile.services && profile.services.length > 0 && (
                  <div className="space-y-0.5 sm:space-y-1 hidden sm:block">
                    <h4 className="font-medium text-xs sm:text-sm text-white flex items-center">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Services
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.services.slice(0, 3).map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                          {service}
                        </Badge>
                      ))}
                      {profile.services.length > 3 && (
                        <span className="text-xs text-slate-500">+{profile.services.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                </CardContent>

              {/* Profile Completion Progress - Inside profile card - Dark Theme */}
              {profileCompletionPercent < 100 && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Profile Completion</span>
                    <span className="text-xs font-bold text-purple-400">{profileCompletionPercent}%</span>
                  </div>
                  <Progress value={profileCompletionPercent} className="h-2 mb-2 bg-slate-700" />
                  <Link href="/company/profile/edit" className="text-xs text-purple-400 hover:text-purple-300 hover:underline">
                    Complete profile to get more jobs →
                  </Link>
                </div>
              )}
            </Card>

          </div>

          {/* Main Content - Reordered for mobile */}
          <div className="lg:col-span-3 flex flex-col space-y-1.5 sm:space-y-6 order-2">
            {/* Success Signals - Top Priority (Messages & New Jobs) - Dark Theme */}
            <div className="flex gap-2 sm:gap-3">
              <Link href="/messages" className="flex-1">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-emerald-300">Messages</div>
                    <div className="text-xs text-emerald-400/80">View conversations</div>
                  </div>
                  {unreadMessagesCount > 0 && (
                    <Badge className="bg-emerald-500 text-white h-6 min-w-[24px] flex items-center justify-center rounded-full">
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </div>
              </Link>

              {/* Browse trade jobs — takes tradesperson to the jobs_tasks map */}
              <Link href={browseJobsUrl} className="flex-1">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-500/20 rounded-xl border border-orange-500/30 hover:bg-orange-500/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white">
                    <Map className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-orange-300">Browse Jobs</div>
                    <div className="text-xs text-orange-400/80">Find trade work near you</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* My Jobs — matches /dashboard/company/my-jobs layout */}
            <MarkTradespersonJobsViewed />

            <div className="space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white flex-1">My Jobs</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {displayedMyJobs.length}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1">
                <button
                  onClick={() => setMyJobsTab("active")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
                    myJobsTab === "active" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                  {activeMyJobs.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${myJobsTab === "active" ? "bg-white/20" : "bg-slate-700 text-slate-300"}`}>
                      {activeMyJobs.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMyJobsTab("history")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
                    myJobsTab === "history" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  History
                  {historyMyJobs.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${myJobsTab === "history" ? "bg-white/20" : "bg-slate-700 text-slate-300"}`}>
                      {historyMyJobs.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Job cards */}
              {displayedMyJobs.length === 0 ? (
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-14 text-center">
                  <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300 mb-1">
                    {myJobsTab === "history" ? "No completed jobs yet" : "No active jobs yet"}
                  </p>
                  <p className="text-xs text-slate-500 mb-5">
                    {myJobsTab === "history"
                      ? "Completed jobs will appear here."
                      : "When a homeowner confirms you for a job it will appear here."}
                  </p>
                  {myJobsTab === "active" && (
                    <Link
                      href={browseJobsUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      Browse Jobs
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedMyJobs.map((job: any) => {
                    const isCompleted = job.status === "COMPLETED"
                    const homeowner = job.homeowner_profiles
                    const posterName = homeowner
                      ? `${homeowner.first_name} ${homeowner.last_name}`.trim()
                      : "Homeowner"
                    const budget = formatBudget(job.budget_min, job.budget_max)
                    const dateLabel = isCompleted
                      ? `Completed ${formatJobDate(job.completed_at)}`
                      : `Confirmed ${formatJobDate(job.confirmed_at)}`

                    return (
                      <div
                        key={job.id}
                        className={`bg-slate-800/80 border rounded-2xl p-4 flex gap-3 ${
                          isCompleted ? "border-slate-700/40" : "border-emerald-500/25"
                        }`}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${isCompleted ? "bg-blue-400" : "bg-emerald-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-white leading-snug">{job.title}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                              isCompleted
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            }`}>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {isCompleted ? "Completed" : "Active"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {job.location && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {dateLabel}
                            </span>
                            {budget && (
                              <span className="text-xs font-semibold text-emerald-400">{budget}</span>
                            )}
                          </div>
                          {posterName && (
                            <p className="text-xs text-slate-500 mt-0.5">Posted by {posterName}</p>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {homeowner?.user_id && (
                              <Link
                                href={`/messages/${homeowner.user_id}?job=${job.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Message
                              </Link>
                            )}
                            <Link
                              href={`/jobs/${job.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                            >
                              View Job
                            </Link>
                            {!isCompleted && (
                              <MarkJobCompleteButton
                                jobId={job.id}
                                jobTitle={job.title}
                                redirectAfter="/dashboard/company"
                              />
                            )}
                            {isCompleted && homeowner?.user_id && (
                              <ReviewHomeownerButton
                                jobId={job.id}
                                jobTitle={job.title}
                                homeownerUserId={homeowner.user_id}
                                homeownerName={posterName}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Statistics shortcut card */}
            <Link href="/dashboard/company/statistics">
              <Card className="overflow-hidden border border-purple-500/30 shadow-sm rounded-xl bg-slate-800 hover:bg-slate-700/80 transition-colors cursor-pointer">
                <CardHeader className="px-4 py-3 bg-purple-500/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/30">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">Business Statistics</span>
                      <p className="text-xs text-slate-400">Performance metrics & insights</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>
                </CardHeader>
              </Card>
            </Link>

            {/* Admin Button */}
            <div className="hidden md:flex justify-center mb-4">
              <AdminButton />
            </div>

          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <Dialog open={showReviewsModal} onOpenChange={setShowReviewsModal}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 text-white shadow-2xl shadow-black/60 p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-yellow-300 flex-shrink-0" />

          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Header */}
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Reviews
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                {profile.company_name}
              </DialogDescription>
            </div>

            {/* Rating Summary */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="text-center flex-shrink-0">
                <div className="text-4xl font-bold text-amber-400 leading-none">
                  {rating.average_rating > 0 ? rating.average_rating.toFixed(1) : "—"}
                </div>
                <div className="text-xs text-slate-500 mt-1">out of 5</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.min(Math.max(rating.average_rating - star + 1, 0), 1) * 100
                    return (
                      <div key={star} className="relative">
                        <Star className="h-5 w-5 text-slate-600" />
                        <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
                          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-xs text-slate-400">
                  Based on {rating.total_reviews} review{rating.total_reviews !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {review.reviewer_avatar ? (
                          <div className="h-9 w-9 flex-shrink-0 relative rounded-full overflow-hidden border border-slate-600 bg-slate-700">
                            <Image
                              src={review.reviewer_avatar}
                              alt={review.reviewer_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                            {review.reviewer_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-white truncate">{review.reviewer_name}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {review.is_edited && " · edited"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-slate-300 leading-relaxed">{review.review_text}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Star className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No reviews yet</p>
                <p className="text-xs text-slate-600 mt-1">Reviews from homeowners will appear here.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </>
  )
}
