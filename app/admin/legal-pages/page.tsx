import { createClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

interface LegalPage {
  id: string
  page_type: string
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

const pageTypeDescriptions = {
  cookies: "Cookies Policy - How we use cookies on the platform",
  privacy_terms: "Privacy Policy & Terms of Service - Main legal document",
  privacy_centre: "Privacy Centre - User privacy controls and settings",
  security: "Security Information - Platform security measures",
  billing: "Billing Information - Payment and subscription details",
  contact: "Contact Us - Support and contact information",
}

export default async function AdminLegalPagesPage() {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect("/admin/login")
  }

  const supabase = await createClient()

  // Fetch all legal pages
  const { data: legalPages, error } = await supabase
    .from("legal_pages")
    .select("*")
    .order("page_type")

  if (error) {
    console.error("Error fetching legal pages:", error)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Legal Pages Management</h1>
        <p className="text-gray-600 mt-2">
          Manage legal and policy pages content visible to users
        </p>
      </div>

      <div className="grid gap-6">
        {legalPages && legalPages.length > 0 ? (
          legalPages.map((page: LegalPage) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{page.title}</CardTitle>
                      <Badge
                        variant={page.is_active ? "default" : "secondary"}
                        className={page.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        <div className="flex items-center space-x-1">
                          {page.is_active ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          <span>{page.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {pageTypeDescriptions[page.page_type as keyof typeof pageTypeDescriptions] ||
                       `Legal page: ${page.page_type}`}
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>Last updated: {formatDate(page.updated_at)}</p>
                      <p>Page type: <code className="bg-gray-100 px-1 py-0.5 rounded">{page.page_type}</code></p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/admin/legal-pages/${page.page_type}`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  Content preview: {page.content.replace(/<[^>]*>/g, "").substring(0, 150)}
                  {page.content.length > 150 && "..."}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">No legal pages found</p>
              <p className="text-sm text-gray-400">
                Legal pages should be created automatically when the database migration is run.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}