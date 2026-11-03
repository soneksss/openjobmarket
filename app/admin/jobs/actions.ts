"use server"

import { revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminWriteClient } from "@/lib/server"

// Take a job or vacancy off the site (or put it back). Reversible: it only flips
// is_active, which every public listing filters on.
export async function setJobListed(jobId: string, listed: boolean) {
  const adminUser = await getAdminUser()
  if (!adminUser) throw new Error("Access denied")

  const { error } = await createAdminWriteClient()
    .from("jobs")
    .update({ is_active: listed, updated_at: new Date().toISOString() })
    .eq("id", jobId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/jobs")
}
