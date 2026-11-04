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
