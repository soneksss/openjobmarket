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
  Globe,
  Wrench,
  Building2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import MessageModal from "./message-modal"
import UserReviewsDisplay from "./user-reviews-display"

interface ContractorProfile {
  id: string
  user_id: string
  company_name: string
  description?: string
  industry?: string
  services?: string[]
  location?: string
  phone?: string
  website?: string
  profile_photo_url?: string
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
}

interface ContractorDetailViewProps {
  contractor: ContractorProfile
  user: User | null
  userType: string | null
  allowMessaging?: boolean
}

export default function ContractorDetailView({
  contractor,
  user,
  userType,
  allowMessaging = true
}: ContractorDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [returnPath, setReturnPath] = useState<string | null>(null)

  const isOwnProfile = user?.id === contractor.user_id

  // Track where the user came from
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer
      if (referrer.includes('/tasks')) {
        setReturnPath('/tasks')
      } else if (referrer.includes('/jobs')) {
        setReturnPath('/jobs')
      } else if (referrer.includes('/contractors')) {
        setReturnPath('/contractors')
      }
    }
  }, [])

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

    setShowMessageModal(true)
  }

  const handleBack = () => {
    if (returnPath) {
      router.push(returnPath)
    } else {
      router.back()
    }
  }

  const initials = contractor.company_name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={contractor.profile_photo_url} alt={contractor.company_name} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">{contractor.company_name}</h1>
                      {contractor.industry && (
                        <div className="flex items-center text-gray-600 mt-1">
                          <Building2 className="h-4 w-4 mr-1" />
                          <span>{contractor.industry}</span>
                        </div>
                      )}
                      {contractor.location && (
                        <div className="flex items-center text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{contractor.location}</span>
                        </div>
                      )}
                    </div>
                    {!isOwnProfile && user && allowMessaging && (
                      <Button onClick={handleContact}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              {contractor.description && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{contractor.description}</p>
                </div>
              )}

              {/* Services */}
              {contractor.services && contractor.services.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Wrench className="h-4 w-4 mr-2" />
                    Services Offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {contractor.services.map((service, index) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {contractor.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{contractor.phone}</span>
                  </div>
                )}
                {contractor.website && (
                  <a
                    href={contractor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    <span>Website</span>
                  </a>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Member since {formatDate(contractor.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reviews */}
        <div className="lg:col-span-1">
          <UserReviewsDisplay userId={contractor.user_id} />
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <MessageModal
          recipientId={contractor.user_id}
          recipientName={contractor.company_name}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  )
}
