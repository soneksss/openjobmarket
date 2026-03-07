"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { MapPin, Briefcase, ArrowRight, Sparkles, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/context"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ptBR, enGB } from "date-fns/locale"

interface Job {
  id: string
  title: string
  location: string
  created_at: string
  salary_min: number | null
  salary_max: number | null
  category: string | null
}

interface UserProfile {
  latitude: number | null
  longitude: number | null
  skills?: string[]
  services?: string[]
  industry?: string
  location?: string
}

const RADIUS_MILES = 10

function calculateDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function PersonalizedJobsCard() {
  const { locale } = useTranslation()
  const supabase = createClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [totalMatchingJobs, setTotalMatchingJobs] = useState(0)

  useEffect(() => {
    const fetchPersonalizedJobs = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Get user type
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle()

        if (!userData) {
          setIsLoading(false)
          return
        }

        let profile: UserProfile | null = null

        // Fetch profile based on user type
        if (userData.user_type === "company") {
          const { data } = await supabase
            .from("company_profiles")
            .select("latitude, longitude, services, industry, location")
            .eq("user_id", user.id)
            .maybeSingle()
          profile = data
        } else if (userData.user_type === "contractor") {
          const { data } = await supabase
            .from("contractor_profiles")
            .select("latitude, longitude, services, location")
            .eq("user_id", user.id)
            .maybeSingle()
          profile = data
        } else if (userData.user_type === "professional") {
          const { data } = await supabase
            .from("professional_profiles")
            .select("latitude, longitude, skills, location")
            .eq("user_id", user.id)
            .maybeSingle()
          profile = data
        }

        if (!profile || !profile.latitude || !profile.longitude) {
          setIsLoading(false)
          return
        }

        setUserLocation(profile.location || null)

        // Calculate bounding box
        const latDelta = RADIUS_MILES / 69
        const lngDelta = RADIUS_MILES / (69 * Math.cos(profile.latitude * Math.PI / 180))

        // Query trade jobs near user
        const { data: jobsData, error } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            location,
            created_at,
            salary_min,
            salary_max,
            category,
            latitude,
            longitude
          `)
          .eq("status", "open")
          .eq("is_active", true)
          .eq("is_tradespeople_job", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .gte("latitude", profile.latitude - latDelta)
          .lte("latitude", profile.latitude + latDelta)
          .gte("longitude", profile.longitude - lngDelta)
          .lte("longitude", profile.longitude + lngDelta)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) {
          console.error("[PersonalizedJobsCard] Error:", error)
          setIsLoading(false)
          return
        }

        // Filter by exact distance
        const nearbyJobs = (jobsData || [])
          .filter((job: any) => {
            if (!job.latitude || !job.longitude) return false
            const distance = calculateDistanceInMiles(
              profile!.latitude!,
              profile!.longitude!,
              job.latitude,
              job.longitude
            )
            return distance <= RADIUS_MILES
          })

        setTotalMatchingJobs(nearbyJobs.length)
        setJobs(nearbyJobs.slice(0, 3) as Job[])
      } catch (error) {
        console.error("[PersonalizedJobsCard] Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersonalizedJobs()
  }, [])

  const getTimeAgo = (createdAt: string): string => {
    return formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale: locale === "pt-BR" ? ptBR : enGB
    })
  }

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return ""
    if (min && max) return `£${min} - £${max}`
    if (max) return `${locale === "pt-BR" ? "Até" : "Up to"} £${max}`
    return `${locale === "pt-BR" ? "A partir de" : "From"} £${min}`
  }


  // Don't render if loading or no jobs
  if (isLoading || jobs.length === 0) {
    return null
  }

  return (
    <section className="py-4 md:py-6">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Airbnb-style Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            {/* Header */}
            <div className="relative z-10 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-emerald-400 text-sm font-medium uppercase tracking-wide">
                  {locale === "pt-BR" ? "Personalizado para você" : "Personalized for you"}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {locale === "pt-BR"
                  ? `Encontramos ${totalMatchingJobs} ${totalMatchingJobs === 1 ? 'trabalho' : 'trabalhos'} perto de você`
                  : `We found ${totalMatchingJobs} ${totalMatchingJobs === 1 ? 'job' : 'jobs'} near you`
                }
              </h2>

              {userLocation && (
                <div className="flex items-center gap-1.5 text-white/60">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{userLocation}</span>
                  <span className="text-white/40 mx-1">•</span>
                  <span className="text-sm">
                    {locale === "pt-BR" ? "Dentro de 10 milhas" : "Within 10 miles"}
                  </span>
                </div>
              )}
            </div>

            {/* Job Cards */}
            <div className="relative z-10 space-y-3 mb-6">
              {jobs.map((job, index) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {job.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(job.created_at)}
                        </span>
                        {job.category && (
                          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                            {job.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {(job.salary_min || job.salary_max) && (
                        <span className="text-emerald-400 font-semibold whitespace-nowrap">
                          {formatBudget(job.salary_min, job.salary_max)}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="relative z-10 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl h-12 text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              >
                <Link href="/?tab=jobs_tasks">
                  <Briefcase className="w-5 h-5 mr-2" />
                  {locale === "pt-BR" ? "Ver todos os trabalhos" : "Review all jobs"}
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 border-white/20 hover:border-white/40 text-white hover:bg-white/10 rounded-xl h-12 text-base"
              >
                <Link href="/?tab=jobs_tasks&view=map">
                  <MapPin className="w-5 h-5 mr-2" />
                  {locale === "pt-BR" ? "Ver no mapa" : "See on map"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
