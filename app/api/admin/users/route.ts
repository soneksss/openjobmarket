export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

const PAGE_SIZE = 25

// Compute presence status from last_seen_at (no cron needed — derived on read)
function presenceStatus(lastSeenAt: string | null): "online" | "away" | "offline" {
  if (!lastSeenAt) return "offline"
  const ms = Date.now() - new Date(lastSeenAt).getTime()
  if (ms < 2  * 60_000) return "online"
  if (ms < 10 * 60_000) return "away"
  return "offline"
}

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const { searchParams } = request.nextUrl
  const tab    = searchParams.get("tab") ?? "homeowners"
  const search = (searchParams.get("search") ?? "").trim()
  const filter = searchParams.get("filter") ?? ""
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const offset = (page - 1) * PAGE_SIZE

  const db     = createAdminClient()
  const ago7d  = new Date(Date.now() - 7  * 86_400_000).toISOString()
  const ago2m  = new Date(Date.now() - 2  *     60_000).toISOString()

  try {
    if (tab === "homeowners") {
      // ── Homeowners ────────────────────────────────────────────────────────

      let q = db
        .from("users")
        .select(
          "id, email, full_name, location, created_at, updated_at, last_seen_at, is_banned, ban_reason, banned_at, ban_expires_at",
          { count: "exact" }
        )
        .eq("user_type", "homeowner")
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (search) {
        q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,location.ilike.%${search}%`)
      }
      if (filter === "active7d") q = q.gte("updated_at", ago7d)
      if (filter === "online")   q = q.gte("last_seen_at", ago2m)
      if (filter === "banned")   q = q.eq("is_banned", true)

      const { data: homeowners, count, error } = await q
      if (error) throw error

      const ids = (homeowners ?? []).map((h: any) => h.id)

      const { data: jobs } = ids.length
        ? await db.from("jobs").select("homeowner_id, status").in("homeowner_id", ids)
        : { data: [] }

      const jobMap: Record<string, { total: number; active: number; cancelled: number }> = {}
      for (const j of (jobs ?? []) as any[]) {
        if (!jobMap[j.homeowner_id]) jobMap[j.homeowner_id] = { total: 0, active: 0, cancelled: 0 }
        jobMap[j.homeowner_id].total++
        if (["POSTED", "ACTIVE", "CONFIRMED"].includes(j.status)) jobMap[j.homeowner_id].active++
        if (j.status === "CANCELLED") jobMap[j.homeowner_id].cancelled++
      }

      const items = (homeowners ?? []).map((h: any) => ({
        ...h,
        presence:       presenceStatus(h.last_seen_at),
        jobs_posted:    jobMap[h.id]?.total      ?? 0,
        active_jobs:    jobMap[h.id]?.active     ?? 0,
        cancelled_jobs: jobMap[h.id]?.cancelled  ?? 0,
      }))

      const [{ count: totalHo }, { count: activeHo }, { count: onlineHo }] = await Promise.all([
        db.from("users").select("id", { count: "exact", head: true }).eq("user_type", "homeowner"),
        db.from("users").select("id", { count: "exact", head: true }).eq("user_type", "homeowner").gte("updated_at", ago7d),
        db.from("users").select("id", { count: "exact", head: true }).eq("user_type", "homeowner").gte("last_seen_at", ago2m),
      ])

      return NextResponse.json({
        items,
        total: count ?? 0,
        stats: { total: totalHo ?? 0, active7d: activeHo ?? 0, online: onlineHo ?? 0 },
      })

    } else {
      // ── Tradespeople ──────────────────────────────────────────────────────

      let q = db
        .from("company_profiles")
        .select(
          "user_id, company_name, industry, location, open_for_business, updated_at, created_at",
          { count: "exact" }
        )
        .order("updated_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (search) {
        q = q.or(`company_name.ilike.%${search}%,industry.ilike.%${search}%,location.ilike.%${search}%`)
      }
      if (filter === "available") q = q.eq("open_for_business", true)

      const { data: companies, count, error } = await q
      if (error) throw error

      const userIds = (companies ?? []).map((c: any) => c.user_id)

      const [usersRes, reviewsRes, alertsRes] = await Promise.allSettled([
        userIds.length
          ? db.from("users")
              .select("id, email, is_banned, ban_reason, banned_at, ban_expires_at, last_seen_at")
              .in("id", userIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? db.from("reviews").select("company_id, rating").in("company_id", userIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? db.from("urgent_job_dispatch_alerts").select("company_id, responded").in("company_id", userIds)
          : Promise.resolve({ data: [] }),
      ])

      const userMap: Record<string, any> = {}
      const rawUsers = usersRes.status === "fulfilled" ? (usersRes.value.data ?? []) : []
      for (const u of rawUsers as any[]) userMap[u.id] = u

      const reviewMap: Record<string, { sum: number; count: number }> = {}
      const rawReviews = reviewsRes.status === "fulfilled" ? (reviewsRes.value.data ?? []) : []
      for (const r of rawReviews as any[]) {
        if (!reviewMap[r.company_id]) reviewMap[r.company_id] = { sum: 0, count: 0 }
        reviewMap[r.company_id].sum   += r.rating
        reviewMap[r.company_id].count += 1
      }

      const alertMap: Record<string, { dispatched: number; responded: number }> = {}
      const rawAlerts = alertsRes.status === "fulfilled" ? (alertsRes.value.data ?? []) : []
      for (const a of rawAlerts as any[]) {
        if (!alertMap[a.company_id]) alertMap[a.company_id] = { dispatched: 0, responded: 0 }
        alertMap[a.company_id].dispatched++
        if (a.responded) alertMap[a.company_id].responded++
      }

      const items = (companies ?? []).map((c: any) => {
        const u          = userMap[c.user_id] ?? {}
        const rev        = reviewMap[c.user_id]
        const alrt       = alertMap[c.user_id]
        const acceptRate = alrt?.dispatched > 0
          ? Math.round((alrt.responded / alrt.dispatched) * 100) : null

        return {
          user_id:           c.user_id,
          company_name:      c.company_name,
          email:             u.email           ?? null,
          location:          c.location        ?? null,
          industry:          c.industry        ?? null,
          open_for_business: c.open_for_business ?? false,
          last_seen_at:      u.last_seen_at    ?? null,
          presence:          presenceStatus(u.last_seen_at ?? null),
          updated_at:        c.updated_at,
          created_at:        c.created_at,
          is_banned:         u.is_banned       ?? false,
          ban_reason:        u.ban_reason      ?? null,
          banned_at:         u.banned_at       ?? null,
          ban_expires_at:    u.ban_expires_at  ?? null,
          avg_rating:        rev ? Math.round((rev.sum / rev.count) * 10) / 10 : null,
          review_count:      rev?.count        ?? 0,
          dispatched:        alrt?.dispatched  ?? 0,
          responded:         alrt?.responded   ?? 0,
          accept_rate:       acceptRate,
        }
      })

      // Client-side filters that need presence data
      let filtered = items
      if (filter === "online")      filtered = items.filter(i => i.presence === "online")
      if (filter === "lowresponse") filtered = items.filter(i => i.accept_rate !== null && i.accept_rate < 20)
      if (filter === "toprated")    filtered = items.filter(i => i.avg_rating !== null && i.avg_rating >= 4.5)

      const returnItems = filtered.length < items.length ? filtered : items
      const returnTotal = filtered.length < items.length ? filtered.length : (count ?? 0)

      // Stats: real presence count from users table
      const [{ count: totalTp }, { count: onlineTp }] = await Promise.all([
        db.from("company_profiles").select("user_id", { count: "exact", head: true }),
        db.from("users").select("id", { count: "exact", head: true }).gte("last_seen_at", ago2m)
          .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      ])

      return NextResponse.json({
        items: returnItems,
        total: returnTotal,
        stats: { total: totalTp ?? 0, online: onlineTp ?? 0 },
      })
    }
  } catch (err) {
    console.error("[ADMIN-USERS]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
