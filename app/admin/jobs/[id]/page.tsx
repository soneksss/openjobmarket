import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"
import { formatMoney } from "@/lib/currency"
import { takeDownJob, reopenJob } from "../actions"
import { jobState, conversationKey } from "../job-state"

export const dynamic = "force-dynamic"

// One job and every message sent about it, read-only, grouped by conversation
// (each conversation is one person replying to the poster). Rendered once on
// the server: three queries, no polling.

type Msg = {
  id: string
  conversation_id: string | null
  sender_id: string
  recipient_id: string
  content: string | null
  message_type: string | null
  metadata: Record<string, any> | null
  photo_urls: string[] | null
  created_at: string
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  const { id } = await params
  const db = createAdminClient()

  const [{ data: job }, { data: msgData }] = await Promise.all([
    db.from("jobs")
      .select("id, title, description, location, status, is_active, expires_at, is_tradespeople_job, currency, created_at, " +
        "company_profiles!company_id(company_name, user_id), homeowner_profiles!homeowner_id(first_name, last_name, user_id)")
      .eq("id", id)
      .maybeSingle(),
    db.from("messages")
      .select("id, conversation_id, sender_id, recipient_id, content, message_type, metadata, photo_urls, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true })
      .limit(2000),
  ])
  if (!job) notFound()
  const j = job as any
  const messages = (msgData ?? []) as Msg[]

  // Names for everyone in these conversations: business name if they have one,
  // otherwise their account name, otherwise their email.
  const people = [...new Set(messages.flatMap(m => [m.sender_id, m.recipient_id]))]
  const names: Record<string, string> = {}
  const emails: Record<string, string> = {}
  if (people.length > 0) {
    const [{ data: users }, { data: companies }] = await Promise.all([
      db.from("users").select("id, full_name, nickname, email").in("id", people),
      db.from("company_profiles").select("user_id, company_name").in("user_id", people),
    ])
    for (const u of (users ?? []) as any[]) {
      names[u.id] = u.full_name || u.nickname || u.email || "Unknown"
      if (u.email) emails[u.id] = u.email
    }
    for (const c of (companies ?? []) as any[]) if (c.company_name) names[c.user_id] = c.company_name
  }
  const nameOf = (uid: string) => names[uid] ?? "Deleted account"

  const posterId: string | null = j.company_profiles?.user_id ?? j.homeowner_profiles?.user_id ?? null
  const poster = j.company_profiles?.company_name
    ?? ([j.homeowner_profiles?.first_name, j.homeowner_profiles?.last_name].filter(Boolean).join(" ") || "—")

  const threads = new Map<string, Msg[]>()
  for (const m of messages) {
    const k = conversationKey(m)
    if (!threads.has(k)) threads.set(k, [])
    threads.get(k)!.push(m)
  }

  const state = jobState(j, Date.now())

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link href="/admin/jobs" prefetch={false} className="text-xs text-zinc-500 hover:text-white">← All jobs</Link>

      <div className="rounded-xl border border-zinc-800 p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{j.title}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {j.is_tradespeople_job ? "Trade job" : "Vacancy"} · {poster}
              {posterId && emails[posterId] ? ` (${emails[posterId]})` : ""} · {j.location ?? "—"} · posted {new Date(j.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-400">{state.label}</span>
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
            <Link href={`/jobs/${j.id}`} prefetch={false} target="_blank" className="text-xs text-zinc-400 hover:text-white">View on site ↗</Link>
          </div>
        </div>
        {j.description && <p className="text-sm text-zinc-300 whitespace-pre-line line-clamp-6">{j.description}</p>}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-200">Replies ({threads.size})</h2>
        <p className="text-xs text-zinc-500">Read-only. Each block is one person&apos;s conversation with the poster about this job.</p>
      </div>

      {threads.size === 0 && <p className="text-sm text-zinc-500">No replies yet.</p>}

      {[...threads.values()].map(thread => {
        const first = thread[0]
        const other = first.sender_id === posterId ? first.recipient_id : first.sender_id
        return (
          <div key={conversationKey(first)} className="rounded-xl border border-zinc-800">
            <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-400">
              <span className="text-zinc-100 font-medium">{nameOf(other)}</span>
              {emails[other] ? ` · ${emails[other]}` : ""} · {thread.length} message{thread.length === 1 ? "" : "s"}
            </div>
            <div className="p-3 space-y-2">
              {thread.map(m => {
                const fromPoster = m.sender_id === posterId
                const photos = m.photo_urls?.length ?? 0
                return (
                  <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${fromPoster ? "ml-auto bg-zinc-800" : "bg-zinc-900 border border-zinc-800"}`}>
                    <div className="text-[11px] text-zinc-500 mb-0.5">{nameOf(m.sender_id)} · {when(m.created_at)}</div>
                    {m.message_type === "quote" && m.metadata?.amount != null && (
                      <div className="text-xs font-semibold text-amber-300">Quote: {formatMoney(Number(m.metadata.amount), m.metadata.currency ?? j.currency)}</div>
                    )}
                    {m.message_type === "vacancy_application" && (
                      <div className="text-xs font-semibold text-sky-300">Application{m.metadata?.cv_name ? ` · CV attached (${m.metadata.cv_name})` : ""}</div>
                    )}
                    {m.content && <p className="text-zinc-200 whitespace-pre-line break-words">{m.content}</p>}
                    {photos > 0 && <div className="text-xs text-zinc-500 mt-1">📷 {photos} photo{photos === 1 ? "" : "s"}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
