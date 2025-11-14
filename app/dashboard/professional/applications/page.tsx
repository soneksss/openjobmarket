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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/professional">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">My Applications</CardTitle>
            <CardDescription>View and manage your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfessionalApplicationsList applications={applications || []} professionalId={profile.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
