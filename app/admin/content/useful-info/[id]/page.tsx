import { createClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect, notFound } from "next/navigation"
import UsefulInfoEditor from "@/components/admin-useful-info-editor"

interface UsefulInfoEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function UsefulInfoEditPage({ params }: UsefulInfoEditPageProps) {
  const { id } = await params
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  const supabase = await createClient()

  // Fetch the specific useful info
  const { data: info, error } = await supabase
    .from("useful_info")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !info) {
    console.error("Error fetching useful info:", error)
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Information</h1>
        <p className="text-gray-600 mt-2">
          Update information "{info.title}"
        </p>
      </div>

      <UsefulInfoEditor infoData={info} adminUserId={adminUser.id} />
    </div>
  )
}