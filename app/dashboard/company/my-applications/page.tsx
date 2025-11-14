import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Briefcase, ArrowLeft, MapPin, Calendar, DollarSign, Building } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default async function CompanyMyApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get all applications submitted BY this company
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
        is_tradespeople_job,
        company_profiles (
          company_name,
          logo_url,
          user_id
        ),
        homeowner_profiles (
          first_name,
          last_name,
          user_id
        )
      )
    `)
    .eq("company_id", profile.id)
    .order("applied_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
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
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/company">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Briefcase className="h-6 w-6 mr-2" />
              My Applications
            </CardTitle>
            <CardDescription>
              View and manage job applications you've submitted ({applications?.length || 0} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!applications || applications.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't applied to any jobs yet. Browse available jobs and apply to get started.
                </p>
                <Button asChild>
                  <Link href="/tasks">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Browse Jobs
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => {
                  const job = application.jobs
                  if (!job) return null

                  // Determine job poster type
                  const isCompanyJob = !!job.company_profiles
                  const isHomeownerJob = !!job.homeowner_profiles

                  const posterName = isCompanyJob
                    ? job.company_profiles.company_name
                    : isHomeownerJob
                    ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}`
                    : "Unknown Poster"

                  const posterType = isCompanyJob ? "Company" : isHomeownerJob ? "Homeowner" : "Unknown"
                  const logoUrl = isCompanyJob ? job.company_profiles.logo_url : null

                  return (
                    <Card
                      key={application.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Logo/Avatar */}
                          <div className="flex-shrink-0">
                            {logoUrl ? (
                              <div className="h-14 w-14 relative rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={logoUrl}
                                  alt={posterName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <Avatar className="h-14 w-14">
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                  {posterName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>

                          {/* Application Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                  {job.title}
                                </h3>
                                <p className="text-gray-700 font-medium mb-1">
                                  {posterName}
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {posterType}
                                  </Badge>
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {job.location}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Applied {formatDate(application.applied_at)}
                                  </div>
                                </div>
                              </div>
                              <Badge className={getStatusColor(application.status)}>
                                {application.status}
                              </Badge>
                            </div>

                            {/* Salary */}
                            {formatSalary(job.salary_min, job.salary_max) && (
                              <div className="flex items-center gap-2 text-green-600 font-semibold mb-3">
                                <DollarSign className="h-4 w-4" />
                                {formatSalary(job.salary_min, job.salary_max)}
                              </div>
                            )}

                            {/* Job Type Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="outline" className="bg-blue-50">
                                {job.job_type}
                              </Badge>
                              {job.is_tradespeople_job && (
                                <Badge variant="outline" className="bg-orange-50">
                                  Task
                                </Badge>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button asChild size="sm">
                                <Link href={`/applications/${application.id}`}>
                                  View Application
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/jobs/${job.id}`}>
                                  View Job
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
