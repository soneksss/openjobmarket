"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MapPin,
  User,
  Upload,
  Briefcase,
  BookmarkIcon,
  Clock,
  Bell,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/client"
import { useToast } from "@/hooks/use-toast"
import pica from "pica"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeownerJob {
  id: string
  title: string
  location: string
  is_active: boolean
  created_at: string
  applications_count?: number
  views_count?: number
}

interface SavedTradesperson {
  id: string
  professional_id: string
  professional_profiles: {
    id: string
    user_id: string
    first_name?: string
    last_name?: string
    nickname?: string
    title?: string
    location?: string
    profile_photo_url?: string
  }
}

interface HomeownerProfile {
  id: string
  first_name: string
  last_name: string
  nickname?: string
  location?: string
  profile_photo_url?: string
}

interface HomeownerDashboardProps {
  user?: any
  profile: HomeownerProfile
  jobs: HomeownerJob[]
  savedTradespeople?: SavedTradesperson[]
  isProfileComplete?: boolean
  missingFields?: string[]
}

// ─── Image resize helper ───────────────────────────────────────────────────────

async function resizeImage(file: File, maxSize = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = async () => {
      try {
        const size = Math.min(img.width, img.height)
        const cropX = (img.width - size) / 2
        const cropY = (img.height - size) / 2
        const canvas = document.createElement("canvas")
        canvas.width = maxSize
        canvas.height = maxSize
        let blob: Blob | null = null
        try {
          const p = pica()
          const tmp = document.createElement("canvas")
          tmp.width = size; tmp.height = size
          const ctx = tmp.getContext("2d")!
          ctx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size)
          await p.resize(tmp, canvas)
          blob = await p.toBlob(canvas, "image/webp", 0.75)
        } catch {
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
          blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.75))
        }
        if (!blob) { reject(new Error("conversion failed")); return }
        URL.revokeObjectURL(img.src)
        resolve(new File([blob], "profile-photo.webp", { type: "image/webp" }))
      } catch (e) { URL.revokeObjectURL(img.src); reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("load failed")) }
    img.src = URL.createObjectURL(file)
  })
}

// ─── Main component ────────────────────────────────────────────────────────────

export function HomeownerDashboard({
  profile,
  jobs,
  savedTradespeople = [],
  user,
  isProfileComplete = true,
  missingFields = [],
}: HomeownerDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(profile.profile_photo_url || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const displayName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Homeowner"
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "HO"
  const activeJobsCount = jobs.filter((j) => j.is_active).length
  const closedJobsCount = jobs.filter((j) => !j.is_active).length

  // ── Unread messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const fetch = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false)
      setUnreadMessages(count || 0)
    }
    fetch()
    const channel = supabase
      .channel("homeowner-dash-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "JPG, PNG or WebP only", variant: "destructive" })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" })
      return
    }
    setUploadingPhoto(true)
    try {
      const resized = await resizeImage(file, 300)
      const fileName = `${user.id}/profile-photo.webp`
      const { error: upErr } = await supabase.storage.from("profile-photos").upload(fileName, resized, { upsert: true, contentType: "image/webp" })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName)
      await supabase.from("homeowner_profiles").update({ profile_photo_url: publicUrl }).eq("id", profile.id)
      setProfilePhotoUrl(publicUrl)
      toast({ title: "Photo updated!" })
      router.refresh()
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" })
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ── Log out ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">

      {/* ── Profile incomplete banner ── */}
      {!isProfileComplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Complete your profile</p>
            <p className="text-xs text-amber-400/70">Missing: {missingFields.join(", ")}</p>
          </div>
          <Link href="/dashboard/homeowner/profile" className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex-shrink-0">
            Fix →
          </Link>
        </div>
      )}

      {/* ── Profile header ── */}
      <div className="bg-slate-800 px-4 py-5">
        <Link href="/dashboard/homeowner/profile" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
          {/* Avatar with upload trigger */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-16 w-16 border-2 border-slate-600">
              <AvatarImage src={profilePhotoUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-slate-700 text-emerald-400 font-bold text-xl">{initials}</AvatarFallback>
            </Avatar>
            {/* Camera overlay — stops propagation so it doesn't follow the Link */}
            <Label
              htmlFor="homeowner-photo-upload"
              className="absolute -bottom-1 -right-1 bg-emerald-600 hover:bg-emerald-500 rounded-full p-1.5 cursor-pointer transition-colors shadow-lg"
              onClick={(e) => e.preventDefault()}
            >
              <Upload className="h-3 w-3 text-white" />
            </Label>
            <Input
              id="homeowner-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </div>

          {/* Name & info */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate">{displayName}</p>
            <p className="text-sm text-slate-400 truncate">{user?.email}</p>
            {profile.location && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0" />
        </Link>
      </div>

      {/* ── Menu sections ── */}
      <div className="divide-y divide-slate-800/80">

        {/* Section 1 — Activity */}
        <div className="py-1">
          {[
            {
              icon: Briefcase,
              label: "My Jobs",
              href: "/dashboard/homeowner/jobs",
              count: activeJobsCount,
              countLabel: activeJobsCount === 1 ? "active" : "active",
            },
            {
              icon: MessageCircle,
              label: "Messages",
              href: "/messages",
              count: unreadMessages,
              countLabel: unreadMessages === 1 ? "unread" : "unread",
              highlight: unreadMessages > 0,
            },
            {
              icon: BookmarkIcon,
              label: "Saved Tradespeople",
              href: "/dashboard/homeowner/saved",
              count: savedTradespeople.length,
              countLabel: "saved",
            },
            {
              icon: Clock,
              label: "Job History",
              href: "/dashboard/homeowner/jobs?status=closed",
              count: closedJobsCount,
              countLabel: "closed",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-slate-400" />
                <span className="font-medium text-white">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className={`text-sm font-semibold ${item.highlight ? "text-emerald-400" : "text-slate-400"}`}>
                    {item.count}
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </div>
            </Link>
          ))}
        </div>

        {/* Section 2 — Profile & Account */}
        <div className="py-1">
          {[
            { icon: User,         label: "Edit Profile",    href: "/dashboard/homeowner/profile" },
            { icon: Bell,         label: "Notifications",   href: "/notifications" },
            { icon: HelpCircle,   label: "Help & Support",  href: "/help" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-slate-400" />
                <span className="font-medium text-white">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </Link>
          ))}
        </div>

        {/* Section 3 — Settings & Legal */}
        <div className="py-1">
          {[
            { icon: Shield, label: "Privacy Policy", href: "/privacy" },
            { icon: Trash2, label: "Delete Account",  href: "/account/delete", danger: true },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${item.danger ? "text-red-500/70" : "text-slate-400"}`} />
                <span className={`font-medium ${item.danger ? "text-red-400" : "text-white"}`}>{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="py-1">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-slate-800 active:bg-slate-800 transition-colors text-red-400 disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{loggingOut ? "Signing out…" : "Sign Out"}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
