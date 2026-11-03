import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"
import {
  Users, Briefcase, Building2, MapPin, Flag, ShieldCheck, Settings, ChevronRight, RefreshCw,
} from "lucide-react"

export const dynamic = "force-dynamic"

// Simple numbers, counted once per visit. Every figure is a head-only count
// query (the database counts; nothing is downloaded), all sent in parallel, so
// the page costs one short render — no polling, no charts, no background jobs.

type Count = { count: number | null }

export default async function AdminDashboardPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  const db = createAdminClient()
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const head = { count: "exact" as const, head: true }
  const jobs = () => db.from("jobs").select("id", head)

  const [
    usersAll, usersWeek, homeowners, businesses,
    tradeAll, tradeWeek, tradeOpen, tradeDone,
    vacAll, vacWeek, vacOpen, vacApps,
    listings, claimed,
    reports, verifications,
  ] = (await Promise.all([
    db.from("users").select("id", head),
    db.from("users").select("id", head).gte("created_at", weekAgo),
    db.from("users").select("id", head).eq("user_type", "homeowner"),
    db.from("users").select("id", head).eq("user_type", "company"),

    jobs().eq("is_tradespeople_job", true),
    jobs().eq("is_tradespeople_job", true).gte("created_at", weekAgo),
    jobs().eq("is_tradespeople_job", true).eq("status", "POSTED").eq("is_active", true),
    jobs().eq("is_tradespeople_job", true).eq("status", "COMPLETED"),

    jobs().eq("is_tradespeople_job", false),
    jobs().eq("is_tradespeople_job", false).gte("created_at", weekAgo),
    jobs().eq("is_tradespeople_job", false).eq("status", "POSTED").eq("is_active", true),
    db.from("messages").select("id", head).eq("message_type", "vacancy_application"),

    db.from("seeded_trades").select("id", head),
    db.from("seeded_trades").select("id", head).eq("claimed", true),

    db.from("user_reports").select("id", head).eq("status", "pending"),
    db.from("company_verification_items").select("id", head).eq("status", "pending"),
  ])) as Count[]

  const n = (c: Count) => c.count ?? 0

  const rows: { title: string; icon: typeof Users; href: string; stats: [string, number][] }[] = [
    { title: "People", icon: Users, href: "/admin/users", stats: [
      ["Accounts", n(usersAll)], ["New this week", n(usersWeek)], ["Homeowners", n(homeowners)], ["Businesses", n(businesses)],
    ] },
    { title: "Trade jobs", icon: Briefcase, href: "/admin/jobs", stats: [
      ["Posted", n(tradeAll)], ["Posted this week", n(tradeWeek)], ["Open now", n(tradeOpen)], ["Completed", n(tradeDone)],
    ] },
    { title: "Vacancies", icon: Building2, href: "/admin/jobs", stats: [
      ["Posted", n(vacAll)], ["Posted this week", n(vacWeek)], ["Open now", n(vacOpen)], ["Applications", n(vacApps)],
    ] },
    { title: "Map listings", icon: MapPin, href: "/admin/seeded-trades", stats: [
      ["Listed businesses", n(listings)], ["Claimed", n(claimed)],
    ] },
  ]

  const attention = [
    { label: "Reports to review", value: n(reports), href: "/admin/reported-users", icon: Flag },
    { label: "Verifications to check", value: n(verifications), href: "/admin/verification", icon: ShieldCheck },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Counted when this page opened</p>
        </div>
        <Link href="/admin/dashboard" prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-600">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attention.map(a => (
          <Link key={a.label} href={a.href} prefetch={false}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${a.value > 0 ? "border-amber-700/60 bg-amber-950/20 hover:bg-amber-950/30" : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"}`}>
            <a.icon className={`h-5 w-5 ${a.value > 0 ? "text-amber-400" : "text-zinc-600"}`} />
            <span className="text-sm text-zinc-300">{a.label}</span>
            <span className={`ml-auto text-2xl font-bold ${a.value > 0 ? "text-amber-300" : "text-zinc-500"}`}>{a.value}</span>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.title} className="rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2 px-4 pt-3">
              <r.icon className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-200">{r.title}</span>
              <Link href={r.href} prefetch={false} className="ml-auto text-xs text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-0.5">
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px p-4 pt-2">
              {r.stats.map(([label, value]) => (
                <div key={label} className="py-1">
                  <div className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString("en-GB")}</div>
                  <div className="text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Link href="/admin/settings" prefetch={false}
        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">
        <Settings className="h-4 w-4 text-zinc-500" /> Settings
        <span className="text-xs text-zinc-500">vacancies on/off, sign-in rules, mobile app version</span>
        <ChevronRight className="ml-auto h-4 w-4 text-zinc-600" />
      </Link>
    </div>
  )
}
