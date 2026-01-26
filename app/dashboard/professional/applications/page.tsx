import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, ArrowLeft } from "lucide-react"
import Link from "next/link"
import ProfessionalApplicationsList from "@/components/professional-applications-list"

export default async function ProfessionalApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get professional profile
  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get all applications for this professional
  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      *,
      jobs (
        id,
        title,
        location,
        job_type,
        salary_min,
        salary_max,
        company_profiles (
          company_name,
          logo_url
        )
      )
    `)
    .eq("professional_id", profile.id)
    .order("applied_at", { ascending: false })

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-3">
        <div className="mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/professional">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">My Applications</CardTitle>
            <CardDescription className="text-xs">View and manage your job applications</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ProfessionalApplicationsList applications={applications || []} professionalId={profile.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
