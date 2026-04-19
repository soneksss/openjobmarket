"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, X, ChevronLeft, ChevronRight, Star, AlertTriangle,
  Ban, ShieldOff, Loader2, MapPin, Clock, MoreHorizontal,
  Users, Building2, Eye, RefreshCw, Copy,
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

// ── Health badges (drawer + company cell) ─────────────────────────────────────

function healthBadges(tp: Tradesperson): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = []
  if (tp.avg_rating !== null && tp.avg_rating >= 4.5)
    badges.push({ label: "Top rated", color: "yellow" })
  if (tp.accept_rate !== null && tp.accept_rate >= 70)
    badges.push({ label: "High performer", color: "emerald" })
  if (tp.accept_rate !== null && tp.accept_rate < 20 && tp.dispatched >= 3)
    badges.push({ label: "Low response", color: "amber" })
  return badges
}

const BADGE_COLORS: Record<string, string> = {
  zinc:    "bg-zinc-700 text-zinc-300",
  yellow:  "bg-yellow-900/60 text-yellow-300",
  emerald: "bg-emerald-900/60 text-emerald-300",
  amber:   "bg-amber-900/60 text-amber-300",
  red:     "bg-red-900/60 text-red-300",
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BADGE_COLORS[color] ?? BADGE_COLORS.zinc}`}>
      {label}
    </span>
  )
}

// ── Presence ──────────────────────────────────────────────────────────────────

const PRESENCE_DOT: Record<Presence, string> = {
  online:  "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]",
  away:    "bg-yellow-400",
  offline: "bg-zinc-600",
}
const PRESENCE_LABEL: Record<Presence, string> = {
  online: "Online", away: "Away", offline: "Offline",
}
const PRESENCE_TEXT: Record<Presence, string> = {
  online: "text-emerald-400", away: "text-yellow-400", offline: "text-zinc-500",
}

function PresenceDot({ p }: { p: Presence }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRESENCE_DOT[p]}`} />
}

function PresencePill({ p }: { p: Presence }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${PRESENCE_TEXT[p]}`}>
      <PresenceDot p={p} />
      {PRESENCE_LABEL[p]}
    </span>
  )
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2">
      <p className="text-lg font-bold text-zinc-100 tabular-nums">{value}</p>
      <div>
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        {sub && <p className="text-xs text-zinc-600">{sub}</p>}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-blue-600/20 border-blue-600/50 text-blue-300"
          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${center ? "text-center" : "text-left"}`}>
      {children}
    </th>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({ id, name, isBanned, onView, onBan, onUnban }: {
  id: string; name: string; isBanned: boolean
  onView: () => void; onBan: () => void; onUnban: () => void
}) {
  const { toast } = useToast()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-900 border-zinc-700 text-zinc-100 w-44 z-50"
        onClick={e => e.stopPropagation()}
      >
        <DropdownMenuItem
          onClick={onView}
          className="cursor-pointer text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100"
        >
          <Eye className="w-3.5 h-3.5 mr-2 text-zinc-400" /> View details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => copyId(id, toast)}
          className="cursor-pointer text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100"
        >
          <Copy className="w-3.5 h-3.5 mr-2 text-zinc-400" /> Copy user ID
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        {isBanned ? (
          <DropdownMenuItem
            onClick={onUnban}
            className="cursor-pointer text-emerald-400 focus:bg-zinc-800 focus:text-emerald-300"
          >
            <ShieldOff className="w-3.5 h-3.5 mr-2" /> Unban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={onBan}
            className="cursor-pointer text-red-400 focus:bg-zinc-800 focus:text-red-300"
          >
            <Ban className="w-3.5 h-3.5 mr-2" /> Ban user
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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

  const { toast } = useToast()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Debounce search
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

  const pages = (total: number) => Math.max(1, Math.ceil(total / 20))

  const onlineNow = (hoStats.online ?? 0) + (tpStats.online ?? 0)

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-4 gap-3">

      {/* Stats — compact strip */}
      <div className="flex items-center gap-3 shrink-0">
        <Stat label="Total Homeowners"   value={hoStats.total ?? "–"} />
        <Stat label="Total Tradespeople" value={tpStats.total ?? "–"} />
        <Stat label="Online Now"         value={onlineNow} sub="active < 2 min" />
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v as any); setSearch("") }} className="flex flex-col flex-1 min-h-0">

        {/* Tab bar + search */}
        <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="homeowners" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
              <Users className="w-3.5 h-3.5 mr-1.5" />Homeowners
              <span className="ml-1.5 text-xs opacity-60">{hoTotal}</span>
            </TabsTrigger>
            <TabsTrigger value="tradespeople" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />Tradespeople
              <span className="ml-1.5 text-xs opacity-60">{tpTotal}</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search email, name, location…"
              className="pl-9 pr-8 h-8 w-64 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── HOMEOWNERS ─────────────────────────────────────────────────── */}
        <TabsContent value="homeowners" className="mt-3 flex flex-col flex-1 min-h-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {[
              ["",         "All"],
              ["online",   "Online"],
              ["active7d", "Active 7d"],
              ["inactive", "Inactive"],
              ["banned",   "Banned"],
            ].map(([val, lbl]) => (
              <Chip key={val} label={lbl} active={hoFilter === val}
                onClick={() => { setHoFilter(val); setHoPage(1) }} />
            ))}
            <button onClick={loadHomeowners} className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw className={`w-4 h-4 ${hoLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Location</Th>
                    <Th>Presence</Th>
                    <Th>Last Seen</Th>
                    <Th>Joined</Th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {hoLoading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-zinc-600">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td></tr>
                  ) : homeowners.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-zinc-600 text-sm">
                      No homeowners found
                    </td></tr>
                  ) : homeowners.map(h => (
                    <tr
                      key={h.id}
                      onClick={() => { setSelected(h); setDrawer(true) }}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                            {(h.full_name ?? h.email)?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-100 truncate max-w-[160px]">
                              {h.full_name ?? <span className="text-zinc-500 italic text-xs">No name</span>}
                            </p>
                            {h.is_banned && (
                              <span className="text-xs text-red-400">Banned</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[200px] truncate">{h.email}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {h.location
                          ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{h.location}</span>
                          : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PresencePill p={h.is_banned ? "offline" : h.presence} />
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {h.last_seen_at ? timeAgo(h.last_seen_at) : "Never"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(h.created_at)}</td>
                      <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                        <RowMenu
                          id={h.id} name={h.full_name ?? h.email} isBanned={h.is_banned}
                          onView={() => { setSelected(h); setDrawer(true) }}
                          onBan={() => openBanDialog(h.id, h.full_name ?? h.email)}
                          onUnban={() => handleUnban(h.id, h.full_name ?? h.email)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="shrink-0">
            <Pagination page={hoPage} total={pages(hoTotal)} onChange={setHoPage} />
          </div>
        </TabsContent>

        {/* ── TRADESPEOPLE ────────────────────────────────────────────────── */}
        <TabsContent value="tradespeople" className="mt-3 flex flex-col flex-1 min-h-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {[
              ["",            "All"],
              ["online",      "Online"],
              ["available",   "Available"],
              ["lowresponse", "Low response"],
              ["toprated",    "Top rated"],
              ["banned",      "Banned"],
            ].map(([val, lbl]) => (
              <Chip key={val} label={lbl} active={tpFilter === val}
                onClick={() => { setTpFilter(val); setTpPage(1) }} />
            ))}
            <button onClick={loadTradespeople} className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw className={`w-4 h-4 ${tpLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <Th>Company</Th>
                    <Th>Email</Th>
                    <Th>Location</Th>
                    <Th>Industry</Th>
                    <Th>Presence</Th>
                    <Th>Last Seen</Th>
                    <Th>Joined</Th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {tpLoading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-zinc-600">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td></tr>
                  ) : tradespeople.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-zinc-600 text-sm">
                      No tradespeople yet
                    </td></tr>
                  ) : tradespeople.map(tp => {
                    const badges = healthBadges(tp)
                    const displayName = tp.company_name ?? tp.email ?? tp.user_id
                    return (
                      <tr
                        key={tp.user_id}
                        onClick={() => { setSelected(tp); setDrawer(true) }}
                        className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0 mt-0.5">
                              {tp.company_name?.[0]?.toUpperCase() ?? "T"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-100 truncate max-w-[160px]">
                                {tp.company_name ?? <span className="text-zinc-500 italic text-xs">Unnamed</span>}
                              </p>
                              {(badges.length > 0 || tp.is_banned) && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {tp.is_banned && <Badge label="Banned" color="red" />}
                                  {badges.map(b => <Badge key={b.label} label={b.label} color={b.color} />)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs max-w-[180px] truncate">{tp.email ?? "—"}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">
                          {tp.location
                            ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{tp.location}</span>
                            : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{tp.industry ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <PresencePill p={tp.is_banned ? "offline" : tp.presence} />
                            {tp.open_for_business && !tp.is_banned && (
                              <span className="text-xs text-blue-400 pl-3.5">Available</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {tp.last_seen_at ? timeAgo(tp.last_seen_at) : "Never"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(tp.created_at)}</td>
                        <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                          <RowMenu
                            id={tp.user_id} name={displayName} isBanned={tp.is_banned}
                            onView={() => { setSelected(tp); setDrawer(true) }}
                            onBan={() => openBanDialog(tp.user_id, displayName)}
                            onUnban={() => handleUnban(tp.user_id, displayName)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="shrink-0">
            <Pagination page={tpPage} total={pages(tpTotal)} onChange={setTpPage} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawer}>
        <SheetContent className="bg-zinc-950 border-l border-zinc-800 text-zinc-100 sm:max-w-[480px] overflow-y-auto p-0">
          {selectedUser && (
            <DrawerContent
              user={selectedUser} tab={tab}
              onBan={(id, name) => { setDrawer(false); openBanDialog(id, name) }}
              onUnban={handleUnban}
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
              Banning <span className="text-zinc-300 font-medium">{banTarget?.name}</span>. This can be reversed.
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
              <label className="text-xs font-medium text-zinc-400">Reason *</label>
              <Textarea
                value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="e.g. Violation of terms, spam, inappropriate behaviour…"
                rows={3}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none"
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
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between text-xs text-zinc-500">
      <span>Page {page} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, total) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, total - 4)) + i
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-7 h-7 rounded text-xs transition-colors ${p === page ? "bg-blue-600 text-white" : "hover:bg-zinc-800 text-zinc-400"}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page >= total}
          className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Drawer detail panel ───────────────────────────────────────────────────────

function DrawerContent({ user, tab, onBan, onUnban }: {
  user: Homeowner | Tradesperson
  tab: "homeowners" | "tradespeople"
  onBan: (id: string, name: string) => void
  onUnban: (id: string, name: string) => Promise<void>
}) {
  const isHo  = tab === "homeowners"
  const ho    = user as Homeowner
  const tp    = user as Tradesperson
  const id    = isHo ? ho.id : tp.user_id
  const name  = isHo ? (ho.full_name ?? ho.email) : (tp.company_name ?? tp.email ?? tp.user_id)
  const badges = !isHo ? healthBadges(tp) : []

  const DRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value ?? <span className="text-zinc-700">—</span>}</span>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div className="px-6 pt-8 pb-5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-200 shrink-0">
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-zinc-100 text-lg font-semibold leading-tight truncate">{name}</SheetTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                {isHo ? "Homeowner" : "Tradesperson"}
              </span>
              {user.is_banned && (
                <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full border border-red-800/50">Banned</span>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Identity</p>
          <DRow label="Email"    value={isHo ? ho.email : tp.email} />
          <DRow label="Location" value={user.location} />
          <DRow label="Joined"   value={fmtDate(user.created_at)} />
          <DRow label="Last seen" value={
            user.last_seen_at
              ? <span className={`flex items-center gap-1.5 ${PRESENCE_TEXT[user.presence as Presence ?? "offline"]}`}>
                  <PresenceDot p={user.presence as Presence ?? "offline"} />
                  {timeAgo(user.last_seen_at)}
                </span>
              : <span className="text-zinc-600">Never</span>
          } />
        </div>

        {isHo ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Activity</p>
            <DRow label="Jobs posted"    value={<span className="font-semibold">{ho.jobs_posted}</span>} />
            <DRow label="Active jobs"    value={<span className="text-emerald-400 font-semibold">{ho.active_jobs}</span>} />
            <DRow label="Cancelled jobs" value={
              ho.cancelled_jobs > 0
                ? <span className="text-amber-400 font-semibold">{ho.cancelled_jobs}</span>
                : "0"
            } />
            {ho.cancelled_jobs >= 3 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                High cancellation rate — may need review
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Performance</p>
            <DRow label="Industry" value={tp.industry} />
            <DRow label="Rating"   value={tp.avg_rating !== null
              ? <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3 h-3" />{tp.avg_rating.toFixed(1)}
                  <span className="text-zinc-500">({tp.review_count} reviews)</span>
                </span>
              : null}
            />
            <DRow label="Dispatched"  value={tp.dispatched} />
            <DRow label="Responded"   value={tp.responded} />
            <DRow label="Accept rate" value={tp.accept_rate !== null
              ? <span className={tp.accept_rate >= 50 ? "text-emerald-400" : "text-amber-400"}>{tp.accept_rate}%</span>
              : null}
            />
            <DRow label="Availability" value={
              tp.open_for_business
                ? <span className="text-blue-400">Available for jobs</span>
                : <span className="text-zinc-600">Not available</span>
            } />
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Account</p>
          <DRow label="Status" value={
            user.is_banned
              ? <span className="text-red-400">Banned</span>
              : <span className="text-emerald-400">Active</span>
          } />
          {user.is_banned && (
            <>
              <DRow label="Ban reason" value={user.ban_reason} />
              <DRow label="Banned at"  value={user.banned_at ? fmtDate(user.banned_at) : null} />
              <DRow label="Expires"    value={user.ban_expires_at ? fmtDate(user.ban_expires_at) : "Permanent"} />
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {user.is_banned ? (
            <Button variant="outline" onClick={() => onUnban(id, name ?? id)}
              className="border-zinc-700 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 bg-transparent">
              <ShieldOff className="w-4 h-4 mr-2" /> Unban User
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onBan(id, name ?? id)}
              className="border-zinc-700 text-red-400 hover:bg-zinc-800 hover:text-red-300 bg-transparent">
              <Ban className="w-4 h-4 mr-2" /> Ban User
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
