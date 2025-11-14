import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import UsefulInfoEditor from "@/components/admin-useful-info-editor"

export default async function NewUsefulInfoPage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  // Default data for new useful info
  const infoData = {
    id: null,
    title: "",
    description: "",
    content: "<h2>Useful Information</h2><p>Enter helpful information here...</p>",
    category: null,
    tags: null,
    image_url: null,
    external_url: null,
    is_active: true,
    is_featured: false,
    view_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Information</h1>
        <p className="text-gray-600 mt-2">
          Add new useful information or resources for users
        </p>
      </div>

      <UsefulInfoEditor infoData={infoData} adminUserId={adminUser.id} />
    </div>
  )
}