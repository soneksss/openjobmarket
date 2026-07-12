export const dynamic = 'force-dynamic'

import { createAdminClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

type Granularity = "day" | "week" | "month"

function getRangeConfig(range: string): { start: Date | null; granularity: Granularity } {
  const now = new Date()
  if (range === "30d") {
    const start = new Date(now); start.setDate(start.getDate() - 30)
    return { start, granularity: "day" }
  }
  if (range === "6m") {
    const start = new Date(now); start.setMonth(start.getMonth() - 6)
    return { start, granularity: "week" }
  }
  if (range === "1y") {
    const start = new Date(now); start.setFullYear(start.getFullYear() - 1)
    return { start, granularity: "month" }
  }
  return { start: null, granularity: "month" } // "max"
}

function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "day") return date.toISOString().slice(0, 10)
  if (granularity === "month") return date.toISOString().slice(0, 7)
  // week: ISO-ish week start (Monday), UTC to avoid TZ drift
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOffset = (d.getUTCDay() + 6) % 7 // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dayOffset)
  return d.toISOString().slice(0, 10)
}

function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-")
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
  }
  return new Date(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function buildBucketKeys(start: Date, end: Date, granularity: Granularity): string[] {
  const seen = new Set<string>()
  const keys: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const key = bucketKey(cur, granularity)
    if (!seen.has(key)) { seen.add(key); keys.push(key) }
    if (granularity === "day") cur.setDate(cur.getDate() + 1)
    else if (granularity === "week") cur.setDate(cur.getDate() + 7)
    else cur.setMonth(cur.getMonth() + 1)
  }
  const endKey = bucketKey(end, granularity)
  if (!seen.has(endKey)) keys.push(endKey)
  return keys
}

/**
 * GET /api/admin/analytics/growth?range=30d|6m|1y|max
 *
 * Real, live-queried registration and visitor growth, bucketed by day/week/
 * month depending on range. Visitors come from page_views (first-party
 * tracking — see components/pageview-tracker.tsx); if that table is empty
 * (tracking just went live), hasVisitorData tells the UI to say so rather
 * than render a chart that looks broken.
 */
export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const range = req.nextUrl.searchParams.get("range") ?? "30d"
    const { start: rangeStart, granularity } = getRangeConfig(range)
    const admin = createAdminClient()

    let start = rangeStart
    if (!start) {
      const { data: earliestUser } = await admin
        .from("users").select("created_at").order("created_at", { ascending: true }).limit(1).maybeSingle()
      start = earliestUser?.created_at ? new Date(earliestUser.created_at) : new Date()
    }
    const now = new Date()

    const [{ data: users }, { data: pageViews }] = await Promise.all([
      admin.from("users").select("user_type, created_at")
        .gte("created_at", start.toISOString()).in("user_type", ["homeowner", "company"]),
      admin.from("page_views").select("visitor_id, created_at").gte("created_at", start.toISOString()),
    ])

    const bucketKeys = buildBucketKeys(start, now, granularity)

    const regMap: Record<string, { homeowners: number; tradespeople: number }> = {}
    for (const k of bucketKeys) regMap[k] = { homeowners: 0, tradespeople: 0 }
    for (const u of (users ?? []) as { user_type: string; created_at: string }[]) {
      const k = bucketKey(new Date(u.created_at), granularity)
      if (!regMap[k]) regMap[k] = { homeowners: 0, tradespeople: 0 }
      if (u.user_type === "homeowner") regMap[k].homeowners++
      else regMap[k].tradespeople++
    }
    const registrationGrowth = bucketKeys.map((k) => ({
      date: bucketLabel(k, granularity),
      homeowners: regMap[k]?.homeowners ?? 0,
      tradespeople: regMap[k]?.tradespeople ?? 0,
    }))

    const visitorSets: Record<string, Set<string>> = {}
    for (const k of bucketKeys) visitorSets[k] = new Set()
    for (const pv of (pageViews ?? []) as { visitor_id: string; created_at: string }[]) {
      const k = bucketKey(new Date(pv.created_at), granularity)
      if (!visitorSets[k]) visitorSets[k] = new Set()
      visitorSets[k].add(pv.visitor_id)
    }
    const visitorGrowth = bucketKeys.map((k) => ({
      date: bucketLabel(k, granularity),
      visitors: visitorSets[k]?.size ?? 0,
      signups: (regMap[k]?.homeowners ?? 0) + (regMap[k]?.tradespeople ?? 0),
    }))

    return NextResponse.json({
      registrationGrowth,
      visitorGrowth,
      hasVisitorData: (pageViews ?? []).length > 0,
    })
  } catch (error) {
    console.error("[ADMIN-GROWTH] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
