import { createClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import LegalPageEditor from "@/components/admin-legal-page-editor"

const validPageTypes = ["cookies", "privacy_terms", "privacy_centre", "security", "billing", "contact"]

const pageTypeNames = {
  cookies: "Cookies Policy",
  privacy_terms: "Privacy Policy & Terms of Service",
  privacy_centre: "Privacy Centre",
  security: "Security Information",
  billing: "Billing Information",
  contact: "Contact Us",
}

interface LegalPageEditPageProps {
  params: Promise<{
    page_type: string
  }>
}

export default async function LegalPageEditPage({ params }: LegalPageEditPageProps) {
  const { page_type } = await params
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  // Validate page type
  if (!validPageTypes.includes(page_type)) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch the specific legal page
  const { data: legalPage, error } = await supabase
    .from("legal_pages")
    .select("*")
    .eq("page_type", page_type)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching legal page:", error)
    throw error
  }

  // If page doesn't exist, create a default one
  const pageData = legalPage || {
    id: null,
    page_type: page_type,
    title: pageTypeNames[page_type as keyof typeof pageTypeNames],
    content: `<h1>${pageTypeNames[page_type as keyof typeof pageTypeNames]}</h1><p>Content for ${page_type} page...</p>`,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: adminUser.id,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Edit {pageTypeNames[page_type as keyof typeof pageTypeNames]}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage content for the {page_type} page
          </p>
        </div>
      </div>

      <LegalPageEditor pageData={pageData} adminUserId={adminUser.id} />
    </div>
  )
}