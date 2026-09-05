import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { AdminVerificationInterface } from "@/components/admin-verification-interface"

export const dynamic = "force-dynamic"

export default async function AdminVerificationPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect("/admin/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <p className="text-muted-foreground">
          Review tradesperson verification requests. Approving a category shows a specific
          trust badge on their public profile — it never implies everything has been checked.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading requests…</div>}>
        <AdminVerificationInterface />
      </Suspense>
    </div>
  )
}
