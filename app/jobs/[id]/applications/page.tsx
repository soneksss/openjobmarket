import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, MapPin, Calendar, User, Briefcase, FileText } from "lucide-react"
import Link from "next/link"
import ApplicationActions from "@/components/application-actions"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function JobApplicationsPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id: jobId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", profile.id)
    .single()

  if (jobError || !job) {
    redirect("/dashboard/company/jobs")
  }

  // Get applications for this job
  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      id,
      status,
      applied_at,
      cover_letter,
      professional_id,
      professional_profiles (
        id,
        user_id,
        first_name,
        last_name,
        title,
        location,
        skills,
        experience_level,
        portfolio_url,
        linkedin_url,
        github_url
      )
    `)
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/company/jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Link>
          </Button>
        </div>

        {/* Job Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {job.location}
                  </span>
                  <Badge variant="outline">{job.job_type}</Badge>
                  <Badge variant="outline">{job.work_location}</Badge>
                </div>
              </div>
              <Badge variant={job.is_active ? "default" : "secondary"}>
                {job.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Applications ({applications?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!applications || applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                <p className="text-sm">
                  When candidates apply for this job, their applications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application: any) => (
                  <div
                    key={application.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar>
                        <AvatarFallback>
                          {application.professional_profiles?.first_name?.[0] || "U"}
                          {application.professional_profiles?.last_name?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">
                            {application.professional_profiles?.first_name || "Unknown"}{" "}
                            {application.professional_profiles?.last_name || "User"}
                          </h4>
                          <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {application.professional_profiles?.title || "Professional"}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {application.professional_profiles?.location || "Location not specified"}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Applied {formatDate(application.applied_at)}
                          </span>
                          {application.professional_profiles?.experience_level && (
                            <span className="flex items-center">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {application.professional_profiles.experience_level}
                            </span>
                          )}
                        </div>
                        {application.professional_profiles?.skills &&
                          application.professional_profiles.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {application.professional_profiles.skills.slice(0, 5).map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {application.professional_profiles.skills.length > 5 && (
                                <span className="text-xs text-muted-foreground">
                                  +{application.professional_profiles.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        {application.cover_letter && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-1">Cover Letter:</p>
                            <p className="text-sm text-muted-foreground line-clamp-3">{application.cover_letter}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button size="sm" asChild>
                        <Link href={`/applications/${application.id}`}>
                          <User className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      {application.professional_profiles?.id && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/professionals/${application.professional_profiles.id}`}>
                            View Profile
                          </Link>
                        </Button>
                      )}
                      {application.professional_profiles?.user_id && (
                        <ApplicationActions
                          applicationId={application.id}
                          currentStatus={application.status}
                          professionalUserId={application.professional_profiles.user_id}
                          companyUserId={user.id}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
