"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Briefcase,
  MapPin,
  Search,
  List,
  Map,
  UserIcon,
  ExternalLink,
  Calendar,
  Filter,
  DollarSign,
  Star,
  Users,
  MessageCircle,
  Globe,
  Languages as LanguagesIcon,
  Clock,
  Car,
  FileCheck,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ProfessionalMap from "@/components/professional-map"
import { createClient } from "@/lib/client"
import { StarRating } from "@/components/star-rating"

interface Professional {
  id: string
  first_name: string
  last_name: string
  nickname?: string
  title: string
  bio: string
  location: string
  latitude?: number
  longitude?: number
  experience_level: string
  skills: string[]
  languages?: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  salary_min?: number
  salary_max?: number
  created_at: string
  profile_photo_url?: string
  is_self_employed?: boolean
  ready_to_relocate?: boolean
  has_driving_licence?: boolean
  has_own_transport?: boolean
  employment_status?: string
  availability?: 'available_now' | 'available_week' | 'available_month' | 'not_specified'
  rating?: number | null
  reviewCount?: number
}

interface ProfessionalSearchProps {
  professionals: Professional[]
  user: any | null
  searchParams: {
    search?: string
    location?: string
    level?: string
    skills?: string
    lat?: string
    lng?: string
    radius?: string
    self_employed?: string
  }
  center: [number, number]
}

export default function ProfessionalSearch({ professionals, user, searchParams, center }: ProfessionalSearchProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [locationFilter, setLocationFilter] = useState(searchParams.location || "")
  const [skillsFilter, setSkillsFilter] = useState(searchParams.skills || "")
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const supabase = createClient()

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(currentSearchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/professionals?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (locationFilter) params.set("location", locationFilter)
    if (skillsFilter) params.set("skills", skillsFilter)
    if (searchParams.level) params.set("level", searchParams.level)
    if (searchParams.self_employed) params.set("self_employed", searchParams.self_employed)
    router.push(`/professionals?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setLocationFilter("")
    setSkillsFilter("")
    router.push("/professionals")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  const formatAvailability = (availability?: string) => {
    if (!availability || availability === 'not_specified') return 'Availability not specified'
    switch (availability) {
      case 'available_now':
        return 'Available now'
      case 'available_week':
        return 'Available within a week'
      case 'available_month':
        return 'Available within a month'
      default:
        return 'Availability not specified'
    }
  }

  const professionalsWithCoordinates = professionals.filter((prof) => prof.latitude && prof.longitude)

  const handleSendInquiry = async (professionalId: string, professionalName: string) => {
    if (!user) {
      router.push("/auth/sign-in")
      return
    }

    setSendingMessage(professionalId)
    try {
      // Generate a unique conversation ID
      const conversationId = `${user.id}-${professionalId}-${Date.now()}`

      // Create initial inquiry message
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: professionalId,
        subject: `Job Opportunity Inquiry`,
        content: `Hello ${professionalName},\n\nI'm interested in discussing a potential job opportunity with you. I came across your profile and believe your skills and experience would be a great fit for our team.\n\nWould you be available for a brief conversation to discuss this further?\n\nBest regards`,
        conversation_id: conversationId,
        message_type: "inquiry",
      })

      if (error) throw error

      // Redirect to the conversation
      router.push(`/messages/${conversationId}`)
    } catch (error) {
      console.error("Error sending inquiry:", error)
      alert("Error sending message. Please try again.")
    } finally {
      setSendingMessage(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="mb-8 bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Users className="h-5 w-5 mr-2 text-secondary" />
              Find Talented Professionals
            </CardTitle>
            <p className="text-muted-foreground">
              Discover skilled professionals ready for new opportunities in your area
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, title, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 w-48"
                  />
                </div>
                <Input
                  placeholder="Skills (comma separated)"
                  value={skillsFilter}
                  onChange={(e) => setSkillsFilter(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-64"
                />
                <Button onClick={handleSearch} className="bg-secondary hover:bg-secondary/90">
                  Search
                </Button>
              </div>
              <div className="flex gap-2">
                <Select
                  value={searchParams.level || "all"}
                  onValueChange={(value) => updateSearchParams("level", value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={searchParams.self_employed || "all"}
                  onValueChange={(value) => updateSearchParams("self_employed", value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Work Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Professionals</SelectItem>
                    <SelectItem value="true">Self-Employed Only</SelectItem>
                    <SelectItem value="false">Employees Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {professionals.length} Professional{professionals.length !== 1 ? "s" : ""} Found
            </h2>
            <p className="text-muted-foreground">
              Connect with talented individuals ready for new opportunities
              {professionalsWithCoordinates.length > 0 &&
                ` • ${professionalsWithCoordinates.length} with location data`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center">
              <Star className="h-3 w-3 mr-1" />
              Premium Talent
            </Badge>
          </div>
        </div>

        {/* Map and List View */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="list" className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              List View ({professionals.length})
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center">
              <Map className="h-4 w-4 mr-2" />
              Map View ({professionalsWithCoordinates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {professionals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No professionals found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or expanding your location range.
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {professionals.map((professional) => (
                  <Card
                    key={professional.id}
                    className="hover:shadow-md transition-all duration-200 hover:border-secondary/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={professional.profile_photo_url || "/placeholder.svg"} />
                          <AvatarFallback className="text-lg bg-secondary/10 text-secondary">
                            {professional.first_name[0]}
                            {professional.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          {/* 1. Profession Title */}
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-1">{professional.title}</h3>
                            <div className="flex items-center gap-2">
                              {/* 2. Nickname or Name */}
                              <p className="text-base font-medium text-foreground">
                                {professional.nickname || `${professional.first_name} ${professional.last_name}`}
                              </p>
                              {/* Star Rating */}
                              {professional.rating !== undefined && professional.rating !== null && professional.rating > 0 && (
                                <StarRating
                                  rating={professional.rating}
                                  totalReviews={professional.reviewCount || 0}
                                  size="sm"
                                  showCount={true}
                                />
                              )}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {professional.location}
                            </div>
                          </div>

                          {/* 3. Bio */}
                          {professional.bio && (
                            <p className="text-sm text-foreground leading-relaxed">{professional.bio}</p>
                          )}

                          {/* 4. Skills */}
                          {professional.skills && professional.skills.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {professional.skills.map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 5. Languages */}
                          {professional.languages && professional.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <LanguagesIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                <span className="font-medium">Languages:</span> {professional.languages.join(', ')}
                              </span>
                            </div>
                          )}

                          {/* 6. Additional Information */}
                          <div className="flex flex-wrap gap-2">
                            {professional.is_self_employed && (
                              <Badge variant="outline" className="text-xs">
                                <Briefcase className="h-3 w-3 mr-1" />
                                Self-Employed
                              </Badge>
                            )}
                            {professional.ready_to_relocate && (
                              <Badge variant="outline" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Ready to Relocate
                              </Badge>
                            )}
                            {professional.has_driving_licence && (
                              <Badge variant="outline" className="text-xs">
                                <FileCheck className="h-3 w-3 mr-1" />
                                Driving Licence
                              </Badge>
                            )}
                            {professional.has_own_transport && (
                              <Badge variant="outline" className="text-xs">
                                <Car className="h-3 w-3 mr-1" />
                                Own Transport
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {professional.experience_level.replace("_", " ")}
                            </Badge>
                          </div>

                          {/* 7. Employment Status */}
                          {professional.employment_status && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">Employment Status:</span>
                              <span className="text-muted-foreground capitalize">{professional.employment_status}</span>
                            </div>
                          )}

                          {/* 8. Availability */}
                          {professional.availability && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">
                                {formatAvailability(professional.availability)}
                              </span>
                            </div>
                          )}

                          {/* 9. Website Links and Actions */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2 flex-wrap">
                              {professional.website_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={professional.website_url} target="_blank" rel="noopener noreferrer">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Website
                                  </a>
                                </Button>
                              )}
                              {professional.portfolio_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={professional.portfolio_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Portfolio
                                  </a>
                                </Button>
                              )}
                              {professional.linkedin_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={professional.linkedin_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    LinkedIn
                                  </a>
                                </Button>
                              )}
                              {professional.github_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={professional.github_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    GitHub
                                  </a>
                                </Button>
                              )}
                              {formatSalary(professional.salary_min, professional.salary_max) && (
                                <span className="text-xs text-muted-foreground flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {formatSalary(professional.salary_min, professional.salary_max)}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="bg-secondary hover:bg-secondary/90"
                              onClick={() =>
                                handleSendInquiry(
                                  professional.id,
                                  professional.nickname || `${professional.first_name} ${professional.last_name}`,
                                )
                              }
                              disabled={sendingMessage === professional.id}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {sendingMessage === professional.id ? "Sending..." : "Contact"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            {professionalsWithCoordinates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Map className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No location data available</h3>
                  <p className="text-muted-foreground mb-4">
                    None of the professionals in your search results have provided location coordinates for map display.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="#list">View List Instead</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-0">
                      <ProfessionalMap professionals={professionals as any} center={center as any} zoom={6} height="600px" />
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-secondary" />
                        {professionalsWithCoordinates.length} Professional
                        {professionalsWithCoordinates.length !== 1 ? "s" : ""} on Map
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Click markers to view professional details</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[520px] overflow-y-auto">
                        {professionalsWithCoordinates.slice(0, 10).map((professional) => (
                          <div
                            key={professional.id}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={professional.profile_photo_url || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs bg-secondary/10 text-secondary">
                                  {professional.first_name[0]}
                                  {professional.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate text-foreground">
                                  {professional.first_name} {professional.last_name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">{professional.title}</p>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {professional.location}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {professional.experience_level.replace("_", " ")}
                                  </Badge>
                                  {professional.skills.slice(0, 2).map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {professional.skills.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{professional.skills.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {professionalsWithCoordinates.length > 10 && (
                          <div className="text-center pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              Showing 10 of {professionalsWithCoordinates.length} professionals with location data
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 bg-transparent"
                              onClick={() => (document.querySelector('[value="list"]') as HTMLElement)?.click()}
                            >
                              View All in List
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
