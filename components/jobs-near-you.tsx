"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/client"
import { MapPin, Clock, Briefcase, MessageCircle, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/context"
import { useSearchLocation } from "@/lib/contexts/search-location-context"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ptBR, enGB } from "date-fns/locale"

interface Job {
  id: string
  title: string
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  created_at: string
  expires_at: string | null
  is_tradespeople_job: boolean
  category: string | null
  salary_min: number | null
  salary_max: number | null
  company_profiles?: {
    company_name: string
    logo_url: string | null
  } | null
  homeowner_profiles?: {
    first_name: string
    last_name: string
    profile_photo_url: string | null
  } | null
}

interface JobsNearYouProps {
  userLocation?: { lat: number; lon: number } | null
  maxJobs?: number
  radiusMiles?: number
}

function calculateDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function CountdownTimer({ expiresAt, locale }: { expiresAt: string; locale: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const expiry = new Date(expiresAt)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft(locale === "pt-BR" ? "Expirado" : "Expired")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(locale === "pt-BR" ? `${days}d ${hours}h` : `${days}d ${hours}h`)
      } else if (hours > 0) {
        setTimeLeft(locale === "pt-BR" ? `${hours}h ${minutes}m` : `${hours}h ${minutes}m`)
      } else {
        setTimeLeft(locale === "pt-BR" ? `${minutes}m` : `${minutes}m`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [expiresAt, locale])

  return (
    <span className="text-orange-500 font-medium flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {timeLeft}
    </span>
  )
}

export function JobsNearYou({ userLocation, maxJobs = 5, radiusMiles = 10 }: JobsNearYouProps) {
  const { t, locale } = useTranslation()
  const { location: contextLocation } = useSearchLocation()
  const supabase = createClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set())
  const subscriptionRef = useRef<any>(null)

  // Use context location (from search input) - prioritize over prop and browser geolocation
  useEffect(() => {
    if (contextLocation) {
      setUserCoords({ lat: contextLocation.lat, lon: contextLocation.lon })
      setLocationName(contextLocation.name)
      return
    }

    if (userLocation) {
      setUserCoords(userLocation)
      return
    }

    // No location selected yet - don't show the section
    setUserCoords(null)
    setIsLoading(false)
  }, [contextLocation, userLocation])

  // Fetch nearby jobs
  const fetchNearbyJobs = async () => {
    if (!userCoords) return

    setIsLoading(true)

    try {
      // Calculate bounding box (1 degree latitude ≈ 69 miles)
      const latDelta = radiusMiles / 69
      const lngDelta = radiusMiles / (69 * Math.cos(userCoords.lat * Math.PI / 180))

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          description,
          location,
          latitude,
          longitude,
          created_at,
          expires_at,
          is_tradespeople_job,
          category,
          salary_min,
          salary_max,
          company_profiles (
            company_name,
            logo_url
          ),
          homeowner_profiles (
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq("status", "open")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .gte("latitude", userCoords.lat - latDelta)
        .lte("latitude", userCoords.lat + latDelta)
        .gte("longitude", userCoords.lon - lngDelta)
        .lte("longitude", userCoords.lon + lngDelta)
        .order("created_at", { ascending: false })
        .limit(maxJobs * 2)

      if (error) {
        console.error("[JobsNearYou] Error fetching jobs:", error)
        return
      }

      // Filter by exact distance and limit
      const nearbyJobs = (data || [])
        .filter((job: Job) => {
          if (!job.latitude || !job.longitude) return false
          const distance = calculateDistanceInMiles(userCoords.lat, userCoords.lon, job.latitude, job.longitude)
          return distance <= radiusMiles
        })
        .slice(0, maxJobs) as Job[]

      setJobs(nearbyJobs)
    } catch (error) {
      console.error("[JobsNearYou] Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userCoords) {
      fetchNearbyJobs()
    }
  }, [userCoords, radiusMiles, maxJobs])

  // Set up real-time subscription
  useEffect(() => {
    if (!userCoords) return

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    const channel = supabase
      .channel("jobs-near-you")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jobs"
        },
        (payload) => {
          const newJob = payload.new as Job

          // Check if job is within radius
          if (newJob.latitude && newJob.longitude) {
            const distance = calculateDistanceInMiles(
              userCoords.lat,
              userCoords.lon,
              newJob.latitude,
              newJob.longitude
            )

            if (distance <= radiusMiles && newJob.is_tradespeople_job) {
              // Mark as new for animation
              setNewJobIds(prev => new Set([...prev, newJob.id]))

              // Add to top of list
              setJobs(prev => {
                const updated = [newJob, ...prev.filter(j => j.id !== newJob.id)]
                return updated.slice(0, maxJobs)
              })

              // Remove new marker after animation
              setTimeout(() => {
                setNewJobIds(prev => {
                  const next = new Set(prev)
                  next.delete(newJob.id)
                  return next
                })
              }, 3000)
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [userCoords, radiusMiles, maxJobs])

  const getPosterName = (job: Job): string => {
    if (job.homeowner_profiles) {
      return `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name?.[0] || ""}.`
    }
    if (job.company_profiles) {
      return job.company_profiles.company_name
    }
    return locale === "pt-BR" ? "Anônimo" : "Anonymous"
  }

  const getTimeAgo = (createdAt: string): string => {
    return formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale: locale === "pt-BR" ? ptBR : enGB
    })
  }

  const getDistance = (job: Job): string => {
    if (!userCoords || !job.latitude || !job.longitude) return ""
    const distance = calculateDistanceInMiles(userCoords.lat, userCoords.lon, job.latitude, job.longitude)
    return distance < 0.1 ? `${Math.round(distance * 5280)}ft` : `${distance.toFixed(1)}mi`
  }


  // Don't show section if no location selected
  if (!userCoords) {
    return null
  }

  if (isLoading) {
    return (
      <section className="py-4 md:py-6 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="ml-2 text-gray-600">
              {locale === "pt-BR" ? "Buscando trabalhos próximos..." : "Finding jobs near you..."}
            </span>
          </div>
        </div>
      </section>
    )
  }

  if (jobs.length === 0) {
    return null // Don't show section if no jobs nearby
  }

  return (
    <section className="py-4 md:py-6 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                {locale === "pt-BR" ? "Trabalhos perto de você" : "Jobs near you"}
              </h2>
              {locationName && (
                <p className="text-sm text-gray-500">{locationName}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNearbyJobs}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {locale === "pt-BR" ? "Atualizar" : "Refresh"}
          </Button>
        </div>

        {/* Jobs List */}
        <div className="space-y-3">
          {jobs.map((job, index) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className={`block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-300 ${
                newJobIds.has(job.id) ? "animate-pulse ring-2 ring-emerald-400 ring-opacity-50" : ""
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: newJobIds.has(job.id) ? "none" : `slideIn 0.3s ease-out ${index * 100}ms both`
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location} • {getDistance(job)}
                    </span>
                    <span>•</span>
                    <span>{getTimeAgo(job.created_at)}</span>
                    {job.expires_at && (
                      <>
                        <span>•</span>
                        <CountdownTimer expiresAt={job.expires_at} locale={locale} />
                      </>
                    )}
                  </div>

                  {/* Budget */}
                  {(job.salary_min || job.salary_max) && (
                    <div className="mt-2 text-sm font-medium text-emerald-600">
                      {job.salary_min && job.salary_max
                        ? `£${job.salary_min} - £${job.salary_max}`
                        : job.salary_max
                          ? `${locale === "pt-BR" ? "Até" : "Up to"} £${job.salary_max}`
                          : `${locale === "pt-BR" ? "A partir de" : "From"} £${job.salary_min}`
                      }
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Category badge */}
                  {job.category && (
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      {job.category}
                    </span>
                  )}

                  {/* CTA */}
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {locale === "pt-BR" ? "Contato" : "Message"}
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View More Link */}
        <div className="mt-4 text-center">
          <Link
            href="/?tab=jobs_tasks"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {locale === "pt-BR" ? "Ver todos os trabalhos" : "View all jobs"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
