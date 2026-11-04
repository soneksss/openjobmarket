import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"
import { takeDownJob, reopenJob } from "./actions"
import { formatMoney } from "@/lib/currency"

export const dynamic = "force-dynamic"

// Latest trade jobs and vacancies, rendered once on the server (one query, 200 rows).
const TABS = [
  { id: "all",      label: "All" },
  { id: "trade",    label: "Trade jobs" },
  { id: "vacancy",  label: "Vacancies" },
] as const

const PERIOD: Record<string, string> = { hourly: "/hr", daily: "/day", weekly: "/wk", monthly: "/mo", yearly: "/yr" }

function money(min: number | null, max: number | null, period: string | null, currency: string | null) {
  if (!min && !max) return "—"
  const f = (v: number) => formatMoney(v, currency)
  const p = (period && PERIOD[period]) ?? ""
  if (min && max) return `${f(min)}–${f(max)}${p}`
  return `${f((min ?? max)!)}${p}`
}

// What the job looks like from the site: open, in progress with a
// tradesperson (left alone), or closed (can be reopened).
function jobState(j: { status: string; is_active: boolean; expires_at: string | null }, now: number) {
  if (j.status === "CONFIRMED" || j.status === "ACTIVE") return { label: "In progress", kind: "busy" as const }
  if (j.status === "POSTED") {
    if (!j.is_active) return { label: "Taken down", kind: "closed" as const }
    if (j.expires_at && new Date(j.expires_at).getTime() < now) return { label: "Expired", kind: "closed" as const }
    return { label: "Open", kind: "open" as const }
  }
  return { label: j.status.charAt(0) + j.status.slice(1).toLowerCase(), kind: "closed" as const }
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  const { type = "all" } = await searchParams
  let q = createAdminClient()
    .from("jobs")
    .select("id, title, location, status, is_active, expires_at, is_tradespeople_job, budget_min, budget_max, budget_period, currency, created_at, " +
      "company_profiles!company_id(company_name), homeowner_profiles!homeowner_id(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (type === "trade") q = q.eq("is_tradespeople_job", true)
  if (type === "vacancy") q = q.eq("is_tradespeople_job", false)
  const { data, error } = await q
  const jobs = (data ?? []) as any[]
  const now = Date.now()

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Jobs</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Latest 200 trade jobs and vacancies. Take down hides one from the site; Reopen puts any closed job back for 14 days.</p>
      </div>

      <div className="flex gap-1.5">
        {TABS.map(t => (
          <Link key={t.id} href={`/admin/jobs${t.id === "all" ? "" : `?type=${t.id}`}`} prefetch={false}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${type === t.id ? "bg-zinc-800 border-zinc-600 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">Could not load jobs: {error.message}</p>}

      <div className="rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Posted by</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Pay</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Posted</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {jobs.map(j => {
              const poster = j.company_profiles?.company_name
                ?? [j.homeowner_profiles?.first_name, j.homeowner_profiles?.last_name].filter(Boolean).join(" ")
              const state = jobState(j, now)
              return (
                <tr key={j.id} className={state.kind === "closed" ? "opacity-50" : ""}>
                  <td className="px-3 py-2">
                    <Link href={`/jobs/${j.id}`} prefetch={false} target="_blank" className="text-zinc-100 hover:underline">{j.title}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${j.is_tradespeople_job ? "bg-orange-500/15 text-orange-300" : "bg-sky-500/15 text-sky-300"}`}>
                      {j.is_tradespeople_job ? "Trade job" : "Vacancy"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{poster || "—"}</td>
                  <td className="px-3 py-2 text-zinc-400 max-w-[180px] truncate">{j.location ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{money(j.budget_min, j.budget_max, j.is_tradespeople_job ? null : j.budget_period, j.currency)}</td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">{state.label}</td>
                  <td className="px-3 py-2 text-zinc-500 text-xs whitespace-nowrap">{new Date(j.created_at).toLocaleDateString("en-GB")}</td>
                  <td className="px-3 py-2 text-right">
                    {state.kind === "open" && (
                      <form action={takeDownJob.bind(null, j.id)}>
                        <button className="text-xs font-medium text-red-400 hover:text-red-300">Take down</button>
                      </form>
                    )}
                    {state.kind === "closed" && (
                      <form action={reopenJob.bind(null, j.id)}>
                        <button className="text-xs font-medium text-emerald-400 hover:text-emerald-300">Reopen</button>
                      </form>
                    )}
                  </td>
                </tr>
              )
            })}
            {jobs.length === 0 && !error && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
