# Contractor Dashboard Component

Save this as `/components/contractor-dashboard.tsx`:

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Briefcase,
  MapPin,
  Edit,
  Search,
  TrendingUp,
  Calendar,
  Building2,
  Plus,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ContractorProfile {
  id: string
  user_id: string
  company_name: string
  description?: string
  industry: string
  services?: string[]
  location: string
  logo_url?: string
  can_hire: boolean
  is_self_employed: boolean
  available_247: boolean
  available_now: boolean
}

interface HomeownerJob {
  id: string
  title: string
  description: string
  category: string
  budget_min?: number
  budget_max?: number
  location: string
  urgency: string
  status: string
  created_at: string
}

interface ContractorDashboardProps {
  user: any
  profile: ContractorProfile
  homeownerJobs: HomeownerJob[]
  stats: {
    availableJobs: number
    totalJobs: number
  }
}

export default function ContractorDashboard({
  user,
  profile,
  homeownerJobs,
  stats,
}: ContractorDashboardProps) {
  const router = useRouter()
  const [showEmployerModal, setShowEmployerModal] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "normal":
        return "bg-blue-100 text-blue-800"
      case "flexible":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="grid lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 bg-muted rounded-full overflow-hidden border flex items-center justify-center">
                    {profile.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt={profile.company_name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-lg font-medium text-muted-foreground">
                        {profile.company_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground">
                      {profile.company_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{profile.industry}</p>
                    <Badge variant="outline" className="mt-2">
                      Contractor
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                {profile.location && (
                  <div className="flex items-start text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile.description && (
                  <p className="text-sm text-foreground line-clamp-3">{profile.description}</p>
                )}

                {profile.services && profile.services.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.services.slice(0, 3).map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/contractor/profile/edit">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>

                  {!profile.can_hire && (
                    <Button
                      onClick={() => setShowEmployerModal(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Unlock Job Posting
                    </Button>
                  )}

                  {profile.can_hire && (
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/dashboard/employer">
                        <Building2 className="h-4 w-4 mr-2" />
                        View Employer Dashboard
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Available Jobs
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {stats.availableJobs}
                      </div>
                    </div>
                    <Briefcase className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Total Tasks
                      </div>
                      <div className="text-2xl font-bold text-foreground">{stats.totalJobs}</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                asChild
                className="h-auto p-6 flex-col bg-green-600 hover:bg-green-700 text-white"
              >
                <Link href="/homeowner/jobs">
                  <Search className="h-8 w-8 mb-2" />
                  <span className="font-bold text-xl">Find Homeowner Tasks</span>
                  <span className="text-sm opacity-90 mt-1">Browse available jobs near you</span>
                </Link>
              </Button>

              {profile.can_hire && (
                <Button
                  asChild
                  className="h-auto p-6 flex-col bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Link href="/jobs/new">
                    <Plus className="h-8 w-8 mb-2" />
                    <span className="font-bold text-xl">Post Job</span>
                    <span className="text-sm opacity-90 mt-1">Hire workers for your projects</span>
                  </Link>
                </Button>
              )}
            </div>

            {/* Available Jobs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-foreground">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Available Homeowner Tasks
                    </CardTitle>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/homeowner/jobs">
                      <Search className="h-4 w-4 mr-2" />
                      Browse All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {homeownerJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No tasks available</p>
                    <p className="text-sm mb-4">Check back later for new homeowner tasks in your area</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {homeownerJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-foreground">{job.title}</h4>
                            <Badge variant="secondary">{job.category}</Badge>
                            <Badge className={getUrgencyColor(job.urgency)}>{job.urgency}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {job.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {job.location}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(job.created_at)}
                            </span>
                            {job.budget_min && job.budget_max && (
                              <span className="font-semibold text-green-600">
                                £{job.budget_min} - £{job.budget_max}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" asChild>
                            <Link href={`/homeowner/jobs/${job.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Employer Modal */}
      {showEmployerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Unlock Job Posting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upgrade to post jobs and hire workers. You'll be able to:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Post unlimited jobs</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Hire professionals and tradespeople</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Manage applications</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Build your team</span>
                </li>
              </ul>
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEmployerModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => router.push("/contractor/upgrade-to-employer")}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

## To Apply:

1. Create the file `/components/contractor-dashboard.tsx` with the code above
2. The page file is already created at `/app/dashboard/contractor/page.tsx`
3. Test by visiting `http://localhost:3005/dashboard/contractor` (after creating a contractor profile in database)
