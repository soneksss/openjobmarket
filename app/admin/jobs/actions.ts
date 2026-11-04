"use server"

import { revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminWriteClient } from "@/lib/server"

// Take a job or vacancy off the site. Reversible with reopenJob.
export async function takeDownJob(jobId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) throw new Error("Access denied")

  const { error } = await createAdminWriteClient()
    .from("jobs")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", jobId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/jobs", "layout")
}

// Put any closed job back on the site for 14 days — taken down, expired,
// filled, completed or cancelled. admin_reopen_job() (migration 20261104000002)
// handles the status change the normal state machine doesn't allow.
export async function reopenJob(jobId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) throw new Error("Access denied")

  const { error } = await createAdminWriteClient().rpc("admin_reopen_job", { p_job_id: jobId, p_days: 14 })
  if (error) throw new Error(error.message)

  revalidatePath("/admin/jobs", "layout")
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reopen several jobs at once (the ticked rows on the jobs list), 10 at a time.
export async function reopenJobs(formData: FormData): Promise<{ reopened: number; failed: number }> {
  const adminUser = await getAdminUser()
  if (!adminUser) throw new Error("Access denied")

  const ids = [...new Set(formData.getAll("ids").map(String).filter(id => UUID_RE.test(id)))].slice(0, 200)
  const db = createAdminWriteClient()
  let reopened = 0
  let failed = 0
  for (let i = 0; i < ids.length; i += 10) {
    const results = await Promise.all(
      ids.slice(i, i + 10).map(id => db.rpc("admin_reopen_job", { p_job_id: id, p_days: 14 })),
    )
    for (const r of results) {
      if (r.error) { failed++; console.error("[ADMIN] reopen failed:", r.error.message) } else reopened++
    }
  }

  revalidatePath("/admin/jobs", "layout")
  return { reopened, failed }
}
