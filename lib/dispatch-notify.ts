/**
 * dispatch-notify.ts
 *
 * Shared helper: send one in-app + web push notification to a single tradesperson
 * and write full tracking to urgent_job_dispatch_alerts.
 *
 * Used by:
 *   - app/api/jobs/[id]/dispatch-urgent/route.ts   (initial dispatch)
 *   - app/api/cron/dispatch-expand/route.ts         (radius expansion cron)
 */

import { sendWebPushToUser } from "@/lib/web-push"
import { sendFcmToTokens } from "@/lib/firebase-admin"

type AdminClient = ReturnType<typeof import("@/lib/server").createAdminClient>

export interface DispatchTarget {
  companyProfileId: string
  userId:           string
}

export interface DispatchPayload {
  jobId:        string
  jobTitle:     string | undefined
  location:     string | undefined
  jobUrl:       string
  budgetMin?:   number | null
  budgetMax?:   number | null
  budgetPeriod?: string | null
}

function formatBudget(min?: number | null, max?: number | null, period?: string | null): string {
  if (!min && !max) return ""
  const periodLabel: Record<string, string> = {
    per_hour:  "/hr",
    per_day:   "/day",
    per_week:  "/wk",
    per_month: "/mo",
  }
  const suffix = period ? (periodLabel[period] ?? "") : ""
  const fmt = (n: number) => `£${n}${suffix}`
  if (min && max && min !== max) return `Budget: ${fmt(min)}–${fmt(max)}`
  return `Budget: ${fmt((min ?? max)!)}`
}

function copy(
  title: string | undefined,
  location: string | undefined,
  budgetMin?: number | null,
  budgetMax?: number | null,
  budgetPeriod?: string | null,
) {
  const t = `Urgent job near you: ${title ?? "New job"}`
  const budget = formatBudget(budgetMin, budgetMax, budgetPeriod)
  const b = `A new urgent job has been posted${location ? ` in ${location}` : ""}${budget ? `. ${budget}` : ""}. Tap to respond quickly — first come, first served.`
  return { title: t, body: b }
}

/**
 * Notify one tradesperson (in-app + web push) and record the result.
 * Never throws — all errors are caught and written to the alert row.
 */
export async function notifyOne(
  admin:   AdminClient,
  target:  DispatchTarget,
  payload: DispatchPayload,
): Promise<{ notified: boolean }> {
  const { jobId, jobTitle, location, jobUrl, budgetMin, budgetMax, budgetPeriod } = payload
  const { companyProfileId, userId } = target
  const { title, body } = copy(jobTitle, location, budgetMin, budgetMax, budgetPeriod)

  // ── 1. Dedup guard ────────────────────────────────────────────────────────
  await admin
    .from("job_notifications_sent")
    .upsert({ job_id: jobId, company_id: companyProfileId }, { onConflict: "job_id,company_id" })

  // ── 2. In-app notification ────────────────────────────────────────────────
  const { error: notifErr } = await admin.from("notifications").insert({
    user_id:  userId,
    type:     "urgent_job_dispatch",
    title,
    message:  body,
    link_url: jobUrl,
    is_read:  false,
  })
  if (notifErr) {
    console.error(`[DISPATCH-NOTIFY] In-app failed user=${userId} job=${jobId}: ${notifErr.message}`)
  }

  // ── 3. Push notifications ─────────────────────────────────────────────────
  // Only use tokens seen in the last 90 days; skip silently if column absent (pre-migration).
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: tokenRows } = await admin
    .from("user_push_tokens")
    .select("token, device_type")
    .eq("user_id", userId)
    .or(`last_seen.is.null,last_seen.gte.${cutoff}`)

  const webTokens = (tokenRows ?? [])
    .filter((r: { token: string; device_type: string }) => r.device_type === "web")
    .map((r: { token: string; device_type: string }) => r.token)

  const fcmTokens = (tokenRows ?? [])
    .filter((r: { token: string; device_type: string }) => r.device_type === "fcm")
    .map((r: { token: string; device_type: string }) => r.token)

  // Keep existing variable name for the web-push block below
  const tokens = webTokens

  // Mark attempted before calling the push service
  await admin
    .from("urgent_job_dispatch_alerts")
    .update({ push_attempted: true })
    .eq("job_id", jobId)
    .eq("company_id", companyProfileId)

  if (tokens.length === 0) {
    await admin
      .from("urgent_job_dispatch_alerts")
      .update({ push_sent: false, push_error: "no_tokens" })
      .eq("job_id", jobId)
      .eq("company_id", companyProfileId)
  } else {
    try {
      const { sent, expired } = await sendWebPushToUser(tokens, {
        title,
        body: body.replace(" — first come, first served.", "."),
        url:  jobUrl,
        tag:  `urgent-job-${jobId}`,
        requireInteraction: true,
      })

      if (expired.length > 0) {
        await admin.from("user_push_tokens").delete().in("token", expired)
      }

      await admin
        .from("urgent_job_dispatch_alerts")
        .update(
          sent > 0
            ? { push_sent: true, push_sent_at: new Date().toISOString(), push_error: null }
            : { push_sent: false, push_error: "all_tokens_failed" }
        )
        .eq("job_id", jobId)
        .eq("company_id", companyProfileId)

      console.log(`[DISPATCH-NOTIFY] push sent=${sent} expired=${expired.length} company=${companyProfileId}`)
    } catch (err: any) {
      const msg = (err?.message ?? String(err)).slice(0, 255)
      await admin
        .from("urgent_job_dispatch_alerts")
        .update({ push_sent: false, push_error: msg })
        .eq("job_id", jobId)
        .eq("company_id", companyProfileId)
      console.error(`[DISPATCH-NOTIFY] Push error company=${companyProfileId}: ${msg}`)
    }
  }

  // ── 4. FCM push (Android / iOS) ──────────────────────────────────────────
  if (fcmTokens.length > 0) {
    try {
      const { sent: fcmSent, failed: fcmFailed } = await sendFcmToTokens(fcmTokens, {
        title,
        body:  body.replace(" — first come, first served.", "."),
        url:   jobUrl,
        tag:   `urgent-job-${jobId}`,
        jobId,
      })

      // Remove stale FCM tokens
      if (fcmFailed.length > 0) {
        await admin.from("user_push_tokens").delete().in("token", fcmFailed)
      }

      // Only update push_sent if web-push didn't already mark it true
      if (tokens.length === 0) {
        await admin
          .from("urgent_job_dispatch_alerts")
          .update(
            fcmSent > 0
              ? { push_sent: true, push_sent_at: new Date().toISOString(), push_error: null }
              : { push_sent: false, push_error: "all_fcm_tokens_failed" }
          )
          .eq("job_id", jobId)
          .eq("company_id", companyProfileId)
      }

      console.log(`[DISPATCH-NOTIFY] FCM sent=${fcmSent} failed=${fcmFailed.length} company=${companyProfileId}`)
    } catch (err: any) {
      console.error(`[DISPATCH-NOTIFY] FCM error company=${companyProfileId}: ${err?.message}`)
    }
  }

  return { notified: !notifErr }
}
