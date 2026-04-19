import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { CompanyStatistics } from "@/components/company-statistics"

export const dynamic = "force-dynamic"

function formatResponseTime(ms: number | null): string {
  if (ms === null) return "—"
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const s = sec % 60
  if (min < 60) return s > 0 ? `${min}m ${s}s` : `${min}m`
  const hr = Math.floor(min / 60)
  const m = min % 60
  if (hr < 24) return m > 0 ? `${hr}h ${m}m` : `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

export default async function StatisticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!profile) redirect("/dashboard/company")

  const profileId = profile.id
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalAppliedRes,
    confirmedRes,
    last7DaysRes,
    completedJobsRes,
    repeatHomeownersRes,
    ratingRes,
    profileViewsRes,
    msgDataRes,
  ] = await Promise.all([
    supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profileId),

    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("confirmed_tradesperson_id", profileId)
      .in("status", ["CONFIRMED", "COMPLETED"]),

    supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profileId)
      .gte("applied_at", sevenDaysAgo),

    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("confirmed_tradesperson_id", profileId)
      .eq("status", "COMPLETED"),

    supabase
      .from("jobs")
      .select("homeowner_id")
      .eq("confirmed_tradesperson_id", profileId)
      .in("status", ["CONFIRMED", "COMPLETED"])
      .not("homeowner_id", "is", null),

    supabase
      .from("user_review_stats")
      .select("average_rating, total_reviews")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("company_profile_views")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profileId)
      .gte("viewed_at", sevenDaysAgo),

    supabase
      .from("messages")
      .select("sender_id, recipient_id, created_at, conversation_id")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .gte("created_at", ninetyDaysAgo)
      .not("conversation_id", "is", null)
      .order("conversation_id")
      .order("created_at", { ascending: true })
      .limit(1000),
  ])

  // Repeat homeowners
  const homeownerIds: string[] = (repeatHomeownersRes.data ?? []).map((j: any) => j.homeowner_id)
  const homeownerFreq: Record<string, number> = {}
  for (const id of homeownerIds) homeownerFreq[id] = (homeownerFreq[id] ?? 0) + 1
  const repeatHomeowners = Object.values(homeownerFreq).filter(c => c > 1).length

  // Avg first response time (homeowner sends first, tradesperson replies)
  const convMap = new Map<string, { firstIncoming: number | null; firstReply: number | null }>()
  for (const msg of msgDataRes.data ?? []) {
    if (!msg.conversation_id) continue
    const isMe = msg.sender_id === user.id
    const t = new Date(msg.created_at).getTime()
    const conv = convMap.get(msg.conversation_id) ?? { firstIncoming: null, firstReply: null }
    if (!isMe && conv.firstIncoming === null) conv.firstIncoming = t
    if (isMe && conv.firstIncoming !== null && conv.firstReply === null && t > conv.firstIncoming) conv.firstReply = t
    convMap.set(msg.conversation_id, conv)
  }
  const responseTimes = [...convMap.values()]
    .filter(c => c.firstIncoming !== null && c.firstReply !== null)
    .map(c => c.firstReply! - c.firstIncoming!)
  const avgResponseMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null

  const totalApplied    = totalAppliedRes.count  ?? 0
  const confirmed       = confirmedRes.count      ?? 0
  const confirmRate     = totalApplied > 0 ? Math.round((confirmed / totalApplied) * 100) : 0
  const completed       = completedJobsRes.count  ?? 0
  const last7Days       = last7DaysRes.count      ?? 0
  const profileViews    = profileViewsRes.count   ?? 0
  const avgRating       = ratingRes.data?.average_rating ?? 0
  const totalReviews    = ratingRes.data?.total_reviews  ?? 0
  const avgResponseTime = formatResponseTime(avgResponseMs)

  return (
    <CompanyStatistics
      companyName={profile.company_name}
      stats={{
        totalApplied,
        confirmed,
        confirmRate,
        completed,
        last7Days,
        repeatHomeowners,
        profileViews,
        avgResponseTime,
        avgRating,
        totalReviews,
      }}
    />
  )
}
