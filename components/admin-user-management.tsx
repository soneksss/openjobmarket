"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, X, ChevronLeft, ChevronRight, Star, AlertTriangle,
  Ban, ShieldOff, Loader2, MoreHorizontal,
  Users, Building2, Eye, RefreshCw, Copy, Wifi, WifiOff, Trash2, UserMinus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ── Types ────────────────────────────────────────────────────────────────────

type Presence = "online" | "away" | "offline"

interface Homeowner {
  id: string
  email: string
  full_name: string | null
  location: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
  presence: Presence
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  ban_expires_at: string | null
  jobs_posted: number
  active_jobs: number
  cancelled_jobs: number
}

interface Tradesperson {
  user_id: string
  company_name: string | null
  email: string | null
  location: string | null
  industry: string | null
  open_for_business: boolean
  last_seen_at: string | null
  presence: Presence
  updated_at: string
  created_at: string
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  ban_expires_at: string | null
  avg_rating: number | null
  review_count: number
  dispatched: number
  responded: number
  accept_rate: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2)   return "just now"
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
}

function copyId(id: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(id).then(() =>
    toast({ title: "Copied", description: "User ID copied to clipboard." })
  )
}

// ── Presence ──────────────────────────────────────────────────────────────────

const PRESENCE_STYLES: Record<Presence, { dot: string; text: string; label: string }> = {
  online:  { dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]", text: "text-emerald-400", label: "Online" },
  away:    { dot: "bg-amber-400",                                           text: "text-amber-400",   label: "Away"   },
  offline: { dot: "bg-zinc-600",                                            text: "text-zinc-500",   label: "Offline"},
}

function PresenceDot({ p }: { p: Presence }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRESENCE_STYLES[p].dot}`} />
}

function PresencePill({ p }: { p: Presence }) {
  const s = PRESENCE_STYLES[p]
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium ${s.text}`}>
      <PresenceDot p={p} />
      {s.label}
    </span>
  )
}

// ── Health badges ─────────────────────────────────────────────────────────────

function healthBadges(tp: Tradesperson): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = []
  if (tp.avg_rating !== null && tp.avg_rating >= 4.5)          badges.push({ label: "Top rated",      color: "yellow"  })
  if (tp.accept_rate !== null && tp.accept_rate >= 70)         badges.push({ label: "High performer", color: "emerald" })
  if (tp.accept_rate !== null && tp.accept_rate < 20 && tp.dispatched >= 3)
                                                               badges.push({ label: "Low response",   color: "amber"   })
  return badges
}

const BADGE_COLORS: Record<string, string> = {
  zinc:    "bg-zinc-700/80 text-zinc-300 border border-zinc-600",
  yellow:  "bg-yellow-900/40 text-yellow-300 border border-yellow-800/50",
  emerald: "bg-emerald-900/40 text-emerald-300 border border-emerald-800/50",
  amber:   "bg-amber-900/40 text-amber-300 border border-amber-800/50",
  red:     "bg-red-900/40 text-red-300 border border-red-800/50",
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${BADGE_COLORS[color] ?? BADGE_COLORS.zinc}`}>
      {label}
    </span>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({ id, name, isBanned, onView, onBan, onUnban, onDelete, onStripCompany }: {
  id: string; name: string; isBanned: boolean
  onView: () => void; onBan: () => void; onUnban: () => void; onDelete: () => void
  onStripCompany?: () => void
}) {
  const { toast } = useToast()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-900 border border-zinc-700 text-zinc-100 w-48 z-50 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={onView} className="cursor-pointer text-zinc-200 focus:bg-zinc-800">
          <Eye className="w-3.5 h-3.5 mr-2 text-zinc-400" /> View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyId(id, toast)} className="cursor-pointer text-zinc-200 focus:bg-zinc-800">
          <Copy className="w-3.5 h-3.5 mr-2 text-zinc-400" /> Copy user ID
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        {isBanned ? (
          <DropdownMenuItem onClick={onUnban} className="cursor-pointer text-emerald-400 focus:bg-zinc-800">
            <ShieldOff className="w-3.5 h-3.5 mr-2" /> Unban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onBan} className="cursor-pointer text-red-400 focus:bg-zinc-800">
            <Ban className="w-3.5 h-3.5 mr-2" /> Ban user
          </DropdownMenuItem>
        )}
        {onStripCompany && (
          <>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem onClick={onStripCompany} className="cursor-pointer text-amber-400 focus:bg-amber-950/30">
              <UserMinus className="w-3.5 h-3.5 mr-2" /> Remove company profile
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-500 focus:bg-red-950/40">
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function Chip({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2 py-0.5 h-6 rounded font-medium transition-all border ${
        active
          ? "bg-indigo-600 border-indigo-500 text-white"
          : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-1 text-[10px] ${active ? "text-indigo-200" : "text-zinc-600"}`}>{count}</span>
      )}
    </button>
  )
}

// ── Table header cell ─────────────────────────────────────────────────────────

function Th({ children, center, w }: { children: React.ReactNode; center?: boolean; w?: string }) {
  return (
    <th className={`px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap ${center ? "text-center" : "text-left"} ${w ?? ""}`}>
      {children}
    </th>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminUserManagement() {
  const [tab, setTab] = useState<"homeowners" | "tradespeople">("homeowners")

  const [homeowners, setHomeowners] = useState<Homeowner[]>([])
  const [hoTotal, setHoTotal]       = useState(0)
  const [hoStats, setHoStats]       = useState<any>({})
  const [hoPage, setHoPage]         = useState(1)
  const [hoFilter, setHoFilter]     = useState("")
  const [hoLoading, setHoLoading]   = useState(false)

  const [tradespeople, setTradespeople] = useState<Tradesperson[]>([])
  const [tpTotal, setTpTotal]           = useState(0)
  const [tpStats, setTpStats]           = useState<any>({})
  const [tpPage, setTpPage]             = useState(1)
  const [tpFilter, setTpFilter]         = useState("")
  const [tpLoading, setTpLoading]       = useState(false)

  const [search, setSearch]         = useState("")
  const [debouncedSearch, setDS]    = useState("")
  const [selectedUser, setSelected] = useState<Homeowner | Tradesperson | null>(null)
  const [drawerOpen, setDrawer]     = useState(false)
  const [banDialog, setBanDialog]   = useState(false)
  const [banTarget, setBanTarget]   = useState<{ id: string; name: string } | null>(null)
  const [banReason, setBanReason]   = useState("")
  const [banDuration, setBanDur]    = useState("permanent")
  const [banning, setBanning]       = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [stripDialog, setStripDialog]   = useState(false)
  const [stripTarget, setStripTarget]   = useState<{ id: string; name: string } | null>(null)
  const [stripping, setStripping]       = useState(false)

  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDS(search); setHoPage(1); setTpPage(1) }, 300)
  }, [search])

  const loadHomeowners = useCallback(async () => {
    setHoLoading(true)
    try {
      const p = new URLSearchParams({ tab: "homeowners", page: String(hoPage), search: debouncedSearch, filter: hoFilter })
      const data = await fetch(`/api/admin/users?${p}`).then(r => r.json())
      setHomeowners(data.items ?? [])
      setHoTotal(data.total ?? 0)
      setHoStats(data.stats ?? {})
    } finally { setHoLoading(false) }
  }, [hoPage, debouncedSearch, hoFilter])

  const loadTradespeople = useCallback(async () => {
    setTpLoading(true)
    try {
      const p = new URLSearchParams({ tab: "tradespeople", page: String(tpPage), search: debouncedSearch, filter: tpFilter })
      const data = await fetch(`/api/admin/users?${p}`).then(r => r.json())
      setTradespeople(data.items ?? [])
      setTpTotal(data.total ?? 0)
      setTpStats(data.stats ?? {})
    } finally { setTpLoading(false) }
  }, [tpPage, debouncedSearch, tpFilter])

  useEffect(() => { loadHomeowners() }, [loadHomeowners])
  useEffect(() => { loadTradespeople() }, [loadTradespeople])

  const openBanDialog = (id: string, name: string) => {
    setBanTarget({ id, name }); setBanDialog(true)
  }

  const confirmBan = async () => {
    if (!banTarget || !banReason.trim()) return
    setBanning(true)
    try {
      const { data: { user: me } } = await supabase.auth.getUser()
      const expiresAt = banDuration !== "permanent"
        ? new Date(Date.now() + parseInt(banDuration) * 86_400_000).toISOString() : null
      const { error } = await supabase.from("users").update({
        is_banned: true, ban_reason: banReason,
        banned_at: new Date().toISOString(), banned_by: me?.id, ban_expires_at: expiresAt,
      }).eq("id", banTarget.id)
      if (error) throw error
      toast({ title: "User banned", description: `${banTarget.name} has been banned.` })
      setBanDialog(false); setBanReason(""); setBanDur("permanent"); setBanTarget(null)
      setDrawer(false)
      await Promise.all([loadHomeowners(), loadTradespeople()])
    } catch {
      toast({ title: "Error", description: "Failed to ban user.", variant: "destructive" })
    } finally { setBanning(false) }
  }

  const handleUnban = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("users").update({
        is_banned: false, ban_reason: null, banned_at: null, banned_by: null, ban_expires_at: null,
      }).eq("id", id)
      if (error) throw error
      toast({ title: "User unbanned", description: `${name} has been unbanned.` })
      setDrawer(false)
      await Promise.all([loadHomeowners(), loadTradespeople()])
    } catch {
      toast({ title: "Error", description: "Failed to unban user.", variant: "destructive" })
    }
  }

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteTarget({ id, name }); setDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Delete failed")
      const unclaimed = json.unclaimedTrades > 0 ? " Seeded trade unclaimed." : ""
      toast({ title: "User deleted", description: `${deleteTarget.name} has been permanently deleted.${unclaimed}` })
      setDeleteDialog(false); setDeleteTarget(null); setDrawer(false)
      await Promise.all([loadHomeowners(), loadTradespeople()])
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message ?? "Something went wrong.", variant: "destructive" })
    } finally { setDeleting(false) }
  }

  const openStripDialog = (id: string, name: string) => {
    setStripTarget({ id, name }); setStripDialog(true)
  }

  const confirmStrip = async () => {
    if (!stripTarget) return
    setStripping(true)
    try {
      const res = await fetch(`/api/admin/users/${stripTarget.id}/company-profile`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Strip failed")
      toast({ title: "Company profile removed", description: `${stripTarget.name} is now homeowner-only. Seeded trade unclaimed.` })
      setStripDialog(false); setStripTarget(null); setDrawer(false)
      await Promise.all([loadHomeowners(), loadTradespeople()])
    } catch (err: any) {
      toast({ title: "Failed", description: err.message ?? "Something went wrong.", variant: "destructive" })
    } finally { setStripping(false) }
  }

  const pages = (total: number) => Math.max(1, Math.ceil(total / 25))
  const onlineNow = (hoStats.online ?? 0) + (tpStats.online ?? 0)
  const isHoTab = tab === "homeowners"
  const loading = isHoTab ? hoLoading : tpLoading

  return (
    <div className="flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── Page header — single compact row ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/30 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">Users</h1>
          <span className="text-xs text-zinc-600">Homeowners and tradespeople</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            Homeowners <span className="font-semibold text-white ml-0.5">{hoStats.total ?? "–"}</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            Tradespeople <span className="font-semibold text-white ml-0.5">{tpStats.total ?? "–"}</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            Online <span className="font-semibold ml-0.5">{onlineNow}</span>
          </span>
        </div>
      </div>

      {/* ── Toolbar — tabs + search + filters all on one row ──────────────── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-zinc-800/50 bg-zinc-900/30 shrink-0 flex-wrap">
        {/* Tab buttons */}
        <button
          onClick={() => { setTab("homeowners"); setSearch("") }}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
            isHoTab
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Users className="w-3 h-3" />
          Homeowners
          <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${isHoTab ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
            {hoTotal}
          </span>
        </button>
        <button
          onClick={() => { setTab("tradespeople"); setSearch("") }}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
            !isHoTab
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Building2 className="w-3 h-3" />
          Tradespeople
          <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${!isHoTab ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
            {tpTotal}
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, location…"
            className="pl-7 pr-7 h-7 w-56 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-xs focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {isHoTab
            ? [["", "All"], ["online", "Online"], ["active7d", "Active 7d"], ["inactive", "Inactive"], ["banned", "Banned"]]
                .map(([val, lbl]) => (
                  <Chip key={val} label={lbl} active={hoFilter === val} onClick={() => { setHoFilter(val); setHoPage(1) }} />
                ))
            : [["", "All"], ["online", "Online"], ["available", "Available"], ["lowresponse", "Low response"], ["toprated", "Top rated"], ["banned", "Banned"]]
                .map(([val, lbl]) => (
                  <Chip key={val} label={lbl} active={tpFilter === val} onClick={() => { setTpFilter(val); setTpPage(1) }} />
                ))
          }
        </div>

        {/* Refresh */}
        <button
          onClick={isHoTab ? loadHomeowners : loadTradespeople}
          className="ml-auto p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="overflow-auto" style={{ height: "calc(100dvh - 195px)", minHeight: "200px" }}>
        {isHoTab ? (
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Location</Th>
                <Th>Presence</Th>
                <Th>Last Seen</Th>
                <Th center>Jobs</Th>
                <Th>Joined</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {hoLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-zinc-600">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading homeowners…</p>
                </td></tr>
              ) : homeowners.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <Users className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs">No homeowners found</p>
                </td></tr>
              ) : homeowners.map(h => (
                <tr
                  key={h.id}
                  onClick={() => { setSelected(h); setDrawer(true) }}
                  className="border-b border-zinc-800/40 odd:bg-transparent even:bg-zinc-900/25 hover:bg-indigo-950/30 cursor-pointer group transition-colors"
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-800/50 flex items-center justify-center text-[9px] font-bold text-indigo-300 shrink-0">
                        {(h.full_name ?? h.email)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-[11px] font-medium text-white truncate max-w-[130px]">
                        {h.full_name ?? <span className="text-zinc-500 italic font-normal">—</span>}
                        {h.is_banned && <span className="text-red-400 ml-1 not-italic font-normal">·ban</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-zinc-300 text-[11px] truncate max-w-[160px]">{h.email}</td>
                  <td className="px-3 py-1.5 text-zinc-400 text-[11px] truncate max-w-[140px]">
                    {h.location
                      ? <span className="truncate">{h.location.split(",")[0]}</span>
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    <PresencePill p={h.is_banned ? "offline" : h.presence} />
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 text-[11px] whitespace-nowrap">
                    {h.last_seen_at ? timeAgo(h.last_seen_at) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center text-[11px] font-medium">
                    <span className={h.jobs_posted > 0 ? "text-zinc-200" : "text-zinc-600"}>
                      {h.jobs_posted}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-[11px] whitespace-nowrap">{fmtDate(h.created_at)}</td>
                  <td className="px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <RowMenu
                      id={h.id} name={h.full_name ?? h.email} isBanned={h.is_banned}
                      onView={() => { setSelected(h); setDrawer(true) }}
                      onBan={() => openBanDialog(h.id, h.full_name ?? h.email)}
                      onUnban={() => handleUnban(h.id, h.full_name ?? h.email)}
                      onDelete={() => openDeleteDialog(h.id, h.full_name ?? h.email ?? h.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
              <tr>
                <Th w="w-[200px]">Company</Th>
                <Th>Email</Th>
                <Th>Location</Th>
                <Th>Industry</Th>
                <Th>Presence</Th>
                <Th>Last Seen</Th>
                <Th center>Rating</Th>
                <Th>Joined</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {tpLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-zinc-600">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading tradespeople…</p>
                </td></tr>
              ) : tradespeople.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12">
                  <Building2 className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs">No tradespeople yet</p>
                </td></tr>
              ) : tradespeople.map(tp => {
                const badges = healthBadges(tp)
                const displayName = tp.company_name ?? tp.email ?? tp.user_id
                return (
                  <tr
                    key={tp.user_id}
                    onClick={() => { setSelected(tp); setDrawer(true) }}
                    className="border-b border-zinc-800/40 odd:bg-transparent even:bg-zinc-900/25 hover:bg-indigo-950/30 cursor-pointer group transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-900/50 border border-blue-800/40 flex items-center justify-center text-[9px] font-bold text-blue-300 shrink-0">
                          {tp.company_name?.[0]?.toUpperCase() ?? "T"}
                        </div>
                        <p className="text-[11px] font-medium text-white truncate max-w-[120px]">
                          {tp.company_name ?? <span className="text-zinc-500 italic font-normal">—</span>}
                          {tp.is_banned && <span className="text-red-400 ml-1 not-italic font-normal">·ban</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-zinc-300 text-[11px] truncate max-w-[160px]">{tp.email ?? <span className="text-zinc-600">—</span>}</td>
                    <td className="px-3 py-1.5 text-zinc-400 text-[11px] truncate max-w-[130px]">
                      {tp.location
                        ? <span>{tp.location.split(",")[0]}</span>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-400 text-[11px] truncate max-w-[110px]">
                      {tp.industry ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <PresencePill p={tp.is_banned ? "offline" : tp.presence} />
                    </td>
                    <td className="px-3 py-1.5 text-zinc-400 text-[11px] whitespace-nowrap">
                      {tp.last_seen_at ? timeAgo(tp.last_seen_at) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {tp.avg_rating !== null
                        ? <span className="text-yellow-400 text-[11px] font-medium">{tp.avg_rating.toFixed(1)}</span>
                        : <span className="text-zinc-600 text-[11px]">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-500 text-[11px] whitespace-nowrap">{fmtDate(tp.created_at)}</td>
                    <td className="px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <RowMenu
                        id={tp.user_id} name={displayName} isBanned={tp.is_banned}
                        onView={() => { setSelected(tp); setDrawer(true) }}
                        onBan={() => openBanDialog(tp.user_id, displayName)}
                        onUnban={() => handleUnban(tp.user_id, displayName)}
                        onDelete={() => openDeleteDialog(tp.user_id, displayName ?? tp.email ?? tp.user_id)}
                        onStripCompany={() => openStripDialog(tp.user_id, displayName ?? tp.email ?? tp.user_id)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-zinc-800/60 shrink-0">
        <Pagination
          page={isHoTab ? hoPage : tpPage}
          total={pages(isHoTab ? hoTotal : tpTotal)}
          onChange={isHoTab ? setHoPage : setTpPage}
        />
      </div>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawer}>
        <SheetContent aria-describedby={undefined} className="bg-zinc-950 border-l border-zinc-800 text-zinc-100 sm:max-w-[480px] overflow-y-auto p-0">
          {selectedUser && (
            <DrawerContent
              user={selectedUser} tab={tab}
              onBan={(id, name) => { setDrawer(false); openBanDialog(id, name) }}
              onUnban={handleUnban}
              onDelete={(id, name) => { setDrawer(false); openDeleteDialog(id, name) }}
              onStripCompany={(id, name) => { setDrawer(false); openStripDialog(id, name) }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Ban dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={banDialog} onOpenChange={v => {
        if (!v) { setBanDialog(false); setBanReason(""); setBanDur("permanent"); setBanTarget(null) }
      }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Ban className="w-4 h-4" /> Ban User
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Banning <span className="text-zinc-200 font-medium">{banTarget?.name}</span>. This can be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Duration</label>
              <Select value={banDuration} onValueChange={setBanDur}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {[["1","1 Day"],["3","3 Days"],["7","7 Days"],["14","14 Days"],["30","30 Days"],["90","90 Days"],["permanent","Permanent"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-zinc-100">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Reason <span className="text-red-500">*</span></label>
              <Textarea
                value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="e.g. Violation of terms, spam, inappropriate behaviour…"
                rows={3}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog(false)} disabled={banning}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBan} disabled={banning || !banReason.trim()}>
              {banning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
              {banning ? "Banning…" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ──────────────────────────────────────────────── */}
      <Dialog open={deleteDialog} onOpenChange={v => { if (!v) { setDeleteDialog(false); setDeleteTarget(null) } }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete User Permanently
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete{" "}
              <span className="text-zinc-200 font-medium">{deleteTarget?.name}</span>{" "}
              and all their data, including profiles, messages, jobs, and push tokens. Any claimed seeded business will be unclaimed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleting}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              {deleting ? "Deleting…" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Strip company profile dialog ────────────────────────────────── */}
      <Dialog open={stripDialog} onOpenChange={v => { if (!v) { setStripDialog(false); setStripTarget(null) } }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <UserMinus className="w-4 h-4" /> Remove Company Profile
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will remove the company profile for{" "}
              <span className="text-zinc-200 font-medium">{stripTarget?.name}</span>{" "}
              and unclaim any seeded business. Their homeowner account and auth login remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStripDialog(false)} disabled={stripping}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent">
              Cancel
            </Button>
            <Button onClick={confirmStrip} disabled={stripping}
              className="bg-amber-600 hover:bg-amber-500 text-white">
              {stripping ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserMinus className="w-4 h-4 mr-1" />}
              {stripping ? "Removing…" : "Remove Company Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between text-xs text-zinc-500">
      <span>Page {page} of {total}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
          className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(5, total) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, total - 4)) + i
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-6 h-6 rounded text-xs transition-colors ${p === page ? "bg-indigo-600 text-white" : "hover:bg-zinc-800 text-zinc-400"}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page >= total}
          className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Drawer detail panel ───────────────────────────────────────────────────────

function DrawerContent({ user, tab, onBan, onUnban, onDelete, onStripCompany }: {
  user: Homeowner | Tradesperson
  tab: "homeowners" | "tradespeople"
  onBan: (id: string, name: string) => void
  onUnban: (id: string, name: string) => Promise<void>
  onDelete: (id: string, name: string) => void
  onStripCompany?: (id: string, name: string) => void
}) {
  const isHo   = tab === "homeowners"
  const ho     = user as Homeowner
  const tp     = user as Tradesperson
  const id     = isHo ? ho.id : tp.user_id
  const name   = isHo ? (ho.full_name ?? ho.email) : (tp.company_name ?? tp.email ?? tp.user_id)
  const badges = !isHo ? healthBadges(tp) : []
  const p      = user.presence as Presence ?? "offline"

  const DRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-zinc-800/70 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0 mt-0.5 w-24">{label}</span>
      <span className="text-sm text-zinc-200 text-right break-all">{value ?? <span className="text-zinc-700">—</span>}</span>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div className="px-6 pt-8 pb-5 border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
            isHo ? "bg-indigo-900/60 border border-indigo-800/50 text-indigo-300"
                 : "bg-blue-900/50 border border-blue-800/40 text-blue-300"
          }`}>
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-white text-lg font-bold leading-tight truncate">{name}</SheetTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                {isHo ? "Homeowner" : "Tradesperson"}
              </span>
              <PresencePill p={user.is_banned ? "offline" : p} />
              {user.is_banned && (
                <span className="text-xs text-red-400 bg-red-950/50 px-2 py-0.5 rounded-full border border-red-800/50">Banned</span>
              )}
            </div>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {badges.map(b => <Badge key={b.label} label={b.label} color={b.color} />)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Identity</p>
          <DRow label="Email"    value={isHo ? ho.email : tp.email} />
          <DRow label="Location" value={user.location} />
          <DRow label="Joined"   value={fmtDate(user.created_at)} />
          <DRow label="Last seen" value={
            user.last_seen_at
              ? <span className={`flex items-center gap-1.5 justify-end ${PRESENCE_STYLES[p].text}`}>
                  <PresenceDot p={p} />
                  {timeAgo(user.last_seen_at)}
                </span>
              : <span className="text-zinc-600">Never</span>
          } />
        </div>

        {isHo ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Activity</p>
            <DRow label="Jobs posted"    value={<span className="font-semibold text-white">{ho.jobs_posted}</span>} />
            <DRow label="Active jobs"    value={<span className="text-emerald-400 font-semibold">{ho.active_jobs}</span>} />
            <DRow label="Cancelled"      value={
              ho.cancelled_jobs > 0
                ? <span className="text-amber-400 font-semibold">{ho.cancelled_jobs}</span>
                : "0"
            } />
            {ho.cancelled_jobs >= 3 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                High cancellation rate — may need review
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Performance</p>
            <DRow label="Industry" value={tp.industry} />
            <DRow label="Rating"   value={tp.avg_rating !== null
              ? <span className="flex items-center gap-1 text-yellow-400 justify-end">
                  <Star className="w-3 h-3" />{tp.avg_rating.toFixed(1)}
                  <span className="text-zinc-500">({tp.review_count})</span>
                </span>
              : null}
            />
            <DRow label="Dispatched"  value={tp.dispatched} />
            <DRow label="Responded"   value={tp.responded} />
            <DRow label="Accept rate" value={tp.accept_rate !== null
              ? <span className={tp.accept_rate >= 50 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>{tp.accept_rate}%</span>
              : null}
            />
            <DRow label="Availability" value={
              tp.open_for_business
                ? <span className="flex items-center gap-1.5 text-blue-400 justify-end"><Wifi className="w-3 h-3" />Available for jobs</span>
                : <span className="flex items-center gap-1.5 text-zinc-500 justify-end"><WifiOff className="w-3 h-3" />Not available</span>
            } />
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Account</p>
          <DRow label="Status" value={
            user.is_banned
              ? <span className="text-red-400 font-semibold">Banned</span>
              : <span className="text-emerald-400 font-semibold">Active</span>
          } />
          {user.is_banned && (
            <>
              <DRow label="Ban reason" value={user.ban_reason} />
              <DRow label="Banned at"  value={user.banned_at ? fmtDate(user.banned_at) : null} />
              <DRow label="Expires"    value={user.ban_expires_at ? fmtDate(user.ban_expires_at) : "Permanent"} />
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          {user.is_banned ? (
            <Button variant="outline" onClick={() => onUnban(id, name ?? id)}
              className="border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/40 bg-transparent">
              <ShieldOff className="w-4 h-4 mr-2" /> Unban User
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onBan(id, name ?? id)}
              className="border-red-800/50 text-red-400 hover:bg-red-950/40 bg-transparent">
              <Ban className="w-4 h-4 mr-2" /> Ban User
            </Button>
          )}
          {!isHo && onStripCompany && (
            <Button variant="outline" onClick={() => onStripCompany(id, name ?? id)}
              className="border-amber-800/50 text-amber-400 hover:bg-amber-950/40 bg-transparent">
              <UserMinus className="w-4 h-4 mr-2" /> Remove Company Profile
            </Button>
          )}
          <Button variant="outline" onClick={() => onDelete(id, name ?? id)}
            className="border-red-900/60 text-red-600 hover:bg-red-950/40 hover:text-red-500 bg-transparent">
            <Trash2 className="w-4 h-4 mr-2" /> Delete User Permanently
          </Button>
        </div>
      </div>
    </>
  )
}
