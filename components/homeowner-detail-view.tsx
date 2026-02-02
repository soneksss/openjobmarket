"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Calendar,
  ArrowLeft,
  MessageCircle,
  Phone,
  User,
  Briefcase
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import UserReviewsDisplay from "./user-reviews-display"
import { RatingDisplay } from "./rating-display"
import { ReviewsList } from "./reviews-list"

interface HomeownerProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
  bio?: string
  profile_photo_url?: string
  average_rating?: number
  reviews_count?: number
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
}

interface HomeownerDetailViewProps {
  homeowner: HomeownerProfile
  user: User | null
  userType: string | null
  allowMessaging?: boolean
  isModal?: boolean
}

export default function HomeownerDetailView({
  homeowner,
  user,
  userType,
  allowMessaging = true,
  isModal = false
}: HomeownerDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [returnPath, setReturnPath] = useState<string | null>(null)
  const [postedJobs, setPostedJobs] = useState<any[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  const isOwnProfile = user?.id === homeowner.user_id

  // Track where the user came from
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer
      if (referrer.includes('/tasks')) {
        setReturnPath('/tasks')
      } else if (referrer.includes('/jobs')) {
        setReturnPath('/jobs')
      }
    }
  }, [])

  // Fetch homeowner's posted jobs
  useEffect(() => {
    fetchPostedJobs()
  }, [homeowner.user_id])

  const fetchPostedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, location, budget_min, budget_max, status, created_at")
        .eq("homeowner_id", homeowner.id)
        .eq("is_tradespeople_job", true)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setPostedJobs(data || [])
    } catch (error) {
      console.error("Error fetching posted jobs:", error)
    } finally {
      setLoadingJobs(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const handleContact = () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    if (!allowMessaging) {
      return
    }

    // Only companies and contractors/traders can contact homeowners
    if (userType === "company" || userType === "contractor") {
      setShowMessageModal(true)
    }
  }

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      // No history, redirect to search page as fallback
      router.push('/search')
    }
  }

  const fullName = `${homeowner.first_name} ${homeowner.last_name}`
  const initials = `${homeowner.first_name.charAt(0)}${homeowner.last_name.charAt(0)}`

  return (
    <div className={isModal ? "px-4 py-8 max-w-6xl" : "container mx-auto px-4 py-8 max-w-6xl"}>
      {/* Back Button */}
      {!isModal && (
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={homeowner.profile_photo_url} alt={fullName} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">{fullName}</h1>
                      {homeowner.location && (
                        <div className="flex items-center text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{homeowner.location}</span>
                        </div>
                      )}
                      <div className="mt-2">
                        <RatingDisplay
                          rating={homeowner.average_rating || 0}
                          reviewsCount={homeowner.reviews_count || 0}
                          size="md"
                        />
                      </div>
                    </div>
                    {!isOwnProfile && user && allowMessaging && (
                      <div className="space-y-2">
                        <Button
                          onClick={handleContact}
                          disabled={userType !== "company" && userType !== "contractor"}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                        {userType !== "company" && userType !== "contractor" && (
                          <p className="text-xs text-muted-foreground text-right">
                            Only employers and tradespeople can contact homeowners
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bio */}
              {homeowner.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{homeowner.bio}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {homeowner.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{homeowner.phone}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Member since {formatDate(homeowner.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posted Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Posted Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <p className="text-gray-500">Loading jobs...</p>
              ) : postedJobs.length > 0 ? (
                <div className="space-y-3">
                  {postedJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/tasks/${job.id}`}
                      className="block p-4 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{job.title}</h4>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {job.location}
                          </p>
                        </div>
                        <div className="text-right">
                          {job.budget_min && job.budget_max && (
                            <p className="font-semibold text-primary">
                              £{job.budget_min} - £{job.budget_max}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-1">
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No active jobs posted yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reviews */}
        <div className="lg:col-span-1">
          <ReviewsList
            userId={homeowner.user_id}
            userType="homeowner"
            title="Reviews"
            limit={5}
            showViewAll={true}
          />
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <MessageModal
          recipientId={homeowner.user_id}
          recipientName={fullName}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  )
}
