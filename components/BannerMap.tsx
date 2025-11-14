"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Star, Briefcase, Clock, Search, ChevronDown, X } from "lucide-react"
import { OnboardingFlow } from "./onboarding/OnboardingFlow"

const AUTO_ADVANCE_MS = 3500
const AUTO_PAUSE_AFTER_CLICK_MS = 8000

// Multiple profession categories with realistic profiles
const PROFESSIONS = {
  "Software Engineer": [
    { name: "David Williams", profession: "Senior Full Stack Engineer", company: "Tech Startup · Shoreditch", rate: "£75k - £95k per year", experience: "8 years", skills: ["React", "Node.js", "AWS"], availability: "Available in 2 weeks", location: "Shoreditch, London", distance: "2.1 km", coords: { x: 58, y: 42 }, rating: 4.9, reviews: 47, image: "DW" },
    { name: "Priya Sharma", profession: "Lead Backend Engineer", company: "Fintech · Canary Wharf", rate: "£85k - £110k per year", experience: "10 years", skills: ["Python", "Django", "PostgreSQL"], availability: "Open to offers", location: "Canary Wharf", distance: "4.8 km", coords: { x: 72, y: 55 }, rating: 4.8, reviews: 62, image: "PS" },
    { name: "Marcus Johnson", profession: "Frontend Developer", company: "E-commerce · Kings Cross", rate: "£60k - £75k per year", experience: "5 years", skills: ["React", "TypeScript", "Tailwind"], availability: "Available now", location: "Kings Cross", distance: "1.5 km", coords: { x: 48, y: 35 }, rating: 4.7, reviews: 34, image: "MJ" },
    { name: "Sarah Chen", profession: "DevOps Engineer", company: "Cloud Services · Old Street", rate: "£70k - £90k per year", experience: "7 years", skills: ["Docker", "Kubernetes", "Terraform"], availability: "Available in 1 month", location: "Old Street", distance: "2.8 km", coords: { x: 54, y: 45 }, rating: 5.0, reviews: 89, image: "SC" },
    { name: "James O'Brien", profession: "Mobile Developer", company: "Media Agency · Soho", rate: "£65k - £80k per year", experience: "6 years", skills: ["React Native", "Swift", "Kotlin"], availability: "Available now", location: "Soho", distance: "3.2 km", coords: { x: 38, y: 52 }, rating: 4.6, reviews: 28, image: "JO" },
    { name: "Elena Popescu", profession: "Data Engineer", company: "Analytics Platform · Bloomsbury", rate: "£80k - £100k per year", experience: "9 years", skills: ["Spark", "Scala", "Airflow"], availability: "Open to offers", location: "Bloomsbury", distance: "2.4 km", coords: { x: 42, y: 48 }, rating: 4.9, reviews: 51, image: "EP" },
    { name: "Tom Anderson", profession: "Full Stack Developer", company: "Startup · Hackney", rate: "£55k - £70k per year", experience: "4 years", skills: ["Vue.js", "Laravel", "MySQL"], availability: "Available now", location: "Hackney", distance: "3.5 km", coords: { x: 62, y: 38 }, rating: 4.5, reviews: 19, image: "TA" },
    { name: "Lisa Wong", profession: "QA Engineer", company: "Gaming · Camden", rate: "£50k - £65k per year", experience: "6 years", skills: ["Selenium", "Jest", "Cypress"], availability: "Available in 2 weeks", location: "Camden", distance: "1.8 km", coords: { x: 45, y: 40 }, rating: 4.8, reviews: 41, image: "LW" },
  ],
  "Electrician": [
    { name: "Mike Harper", profession: "Certified Electrician", company: "Self-employed", rate: "£180 - £250 per day", experience: "12 years", skills: ["Domestic", "Commercial", "Industrial"], availability: "Available now", location: "Islington", distance: "1.2 km", coords: { x: 50, y: 35 }, rating: 4.9, reviews: 127, image: "MH" },
    { name: "Tom Jenkins", profession: "Senior Electrician", company: "City Electrical Ltd", rate: "£200 - £280 per day", experience: "15 years", skills: ["Wiring", "Testing", "Maintenance"], availability: "Available now", location: "Hackney", distance: "2.5 km", coords: { x: 60, y: 40 }, rating: 5.0, reviews: 203, image: "TJ" },
    { name: "Ahmed Ali", profession: "Electrician", company: "Spark Solutions", rate: "£150 - £220 per day", experience: "8 years", skills: ["Installation", "Repair", "Emergency"], availability: "Available now", location: "Bethnal Green", distance: "3.1 km", coords: { x: 58, y: 48 }, rating: 4.7, reviews: 89, image: "AA" },
    { name: "Robert Brown", profession: "Master Electrician", company: "Self-employed", rate: "£220 - £300 per day", experience: "20 years", skills: ["Rewiring", "Fault Finding", "Safety"], availability: "Available in 1 week", location: "Camden", distance: "1.7 km", coords: { x: 48, y: 38 }, rating: 4.9, reviews: 156, image: "RB" },
    { name: "Chris Davies", profession: "Electrician", company: "PowerTech Services", rate: "£160 - £240 per day", experience: "10 years", skills: ["LED", "Solar", "EV Charging"], availability: "Available now", location: "Shoreditch", distance: "2.3 km", coords: { x: 55, y: 43 }, rating: 4.8, reviews: 94, image: "CD" },
    { name: "Paul Singh", profession: "Electrician", company: "Metropolitan Electric", rate: "£170 - £250 per day", experience: "11 years", skills: ["Residential", "Testing", "Certification"], availability: "Available now", location: "Kings Cross", distance: "1.4 km", coords: { x: 46, y: 36 }, rating: 4.6, reviews: 72, image: "PS" },
    { name: "Daniel Murphy", profession: "Electrician", company: "Self-employed", rate: "£165 - £235 per day", experience: "9 years", skills: ["Installation", "Troubleshoot", "Upgrade"], availability: "Available today", location: "Angel", distance: "0.9 km", coords: { x: 52, y: 37 }, rating: 4.9, reviews: 118, image: "DM" },
    { name: "Steven Clarke", profession: "Electrician", company: "London Electrical", rate: "£175 - £260 per day", experience: "13 years", skills: ["Commercial", "Industrial", "PAT Testing"], availability: "Available now", location: "Old Street", distance: "2.0 km", coords: { x: 54, y: 42 }, rating: 4.7, reviews: 101, image: "SC" },
  ],
  "Plumber": [
    { name: "John Smith", profession: "Master Plumber", company: "Smith Plumbing", rate: "£200 - £280 per day", experience: "18 years", skills: ["Heating", "Drainage", "Gas Safe"], availability: "Available now", location: "Islington", distance: "1.1 km", coords: { x: 49, y: 34 }, rating: 4.9, reviews: 189, image: "JS" },
    { name: "Patrick O'Connor", profession: "Emergency Plumber", company: "24/7 Plumbing", rate: "£45 - £65 per hour", experience: "12 years", skills: ["Leak Repair", "Boiler", "Emergency"], availability: "Available 24/7", location: "Camden", distance: "1.6 km", coords: { x: 47, y: 39 }, rating: 4.8, reviews: 142, image: "PO" },
    { name: "David Wilson", profession: "Plumber & Heating Engineer", company: "Self-employed", rate: "£210 - £290 per day", experience: "16 years", skills: ["Central Heating", "Boiler Install", "Power Flush"], availability: "Available now", location: "Hackney", distance: "2.7 km", coords: { x: 59, y: 41 }, rating: 5.0, reviews: 167, image: "DW" },
    { name: "Gary Thompson", profession: "Plumber", company: "City Plumbing Services", rate: "£175 - £250 per day", experience: "10 years", skills: ["Bathroom", "Kitchen", "Maintenance"], availability: "Available now", location: "Bethnal Green", distance: "3.0 km", coords: { x: 57, y: 47 }, rating: 4.7, reviews: 95, image: "GT" },
    { name: "Mark Johnson", profession: "Senior Plumber", company: "Metro Plumbing", rate: "£220 - £300 per day", experience: "20 years", skills: ["Gas", "Drainage", "Bathroom"], availability: "Available in 2 days", location: "Shoreditch", distance: "2.2 km", coords: { x: 56, y: 44 }, rating: 4.9, reviews: 211, image: "MJ" },
    { name: "Andrew Lewis", profession: "Plumber", company: "Self-employed", rate: "£180 - £255 per day", experience: "11 years", skills: ["Repairs", "Installation", "Maintenance"], availability: "Available now", location: "Old Street", distance: "2.1 km", coords: { x: 53, y: 43 }, rating: 4.6, reviews: 83, image: "AL" },
    { name: "Simon Roberts", profession: "Plumber", company: "Roberts & Sons", rate: "£195 - £270 per day", experience: "14 years", skills: ["Heating", "Leaks", "Upgrades"], availability: "Available now", location: "Kings Cross", distance: "1.3 km", coords: { x: 47, y: 37 }, rating: 4.8, reviews: 129, image: "SR" },
    { name: "Kevin Brown", profession: "Plumber", company: "Brown Plumbing", rate: "£185 - £260 per day", experience: "13 years", skills: ["Emergency", "Installation", "Gas"], availability: "Available today", location: "Angel", distance: "1.0 km", coords: { x: 51, y: 36 }, rating: 4.9, reviews: 154, image: "KB" },
  ],
  "Delivery Driver": [
    { name: "Ali Hassan", profession: "Delivery Driver", company: "Express Logistics", rate: "£12 - £15 per hour", experience: "5 years", skills: ["Van Driver", "Same Day", "Parcels"], availability: "Available now", location: "Hackney", distance: "2.4 km", coords: { x: 61, y: 39 }, rating: 4.8, reviews: 67, image: "AH" },
    { name: "Ben Taylor", profession: "Courier Driver", company: "Self-employed", rate: "£13 - £16 per hour", experience: "7 years", skills: ["Multi-drop", "Bike", "Van"], availability: "Available now", location: "Shoreditch", distance: "2.0 km", coords: { x: 57, y: 42 }, rating: 4.7, reviews: 52, image: "BT" },
    { name: "Mohammed Khan", profession: "Delivery Driver", company: "City Couriers", rate: "£11 - £14 per hour", experience: "4 years", skills: ["Food Delivery", "Express", "Local"], availability: "Available today", location: "Bethnal Green", distance: "2.9 km", coords: { x: 59, y: 46 }, rating: 4.6, reviews: 41, image: "MK" },
    { name: "James Wright", profession: "Van Driver", company: "Fast Track Delivery", rate: "£14 - £17 per hour", experience: "8 years", skills: ["Long Distance", "Heavy Items", "White Glove"], availability: "Available now", location: "Old Street", distance: "1.9 km", coords: { x: 55, y: 44 }, rating: 4.9, reviews: 89, image: "JW" },
    { name: "Ryan Mitchell", profession: "Delivery Driver", company: "Quick Parcels", rate: "£11 - £14 per hour", experience: "3 years", skills: ["Same Day", "Next Day", "Tracking"], availability: "Available now", location: "Camden", distance: "1.5 km", coords: { x: 46, y: 40 }, rating: 4.5, reviews: 38, image: "RM" },
    { name: "Jack Wilson", profession: "Courier", company: "Self-employed", rate: "£12 - £15 per hour", experience: "6 years", skills: ["Bike Courier", "Rush Jobs", "City"], availability: "Available now", location: "Islington", distance: "1.3 km", coords: { x: 50, y: 34 }, rating: 4.8, reviews: 73, image: "JW" },
    { name: "Omar Farah", profession: "Delivery Driver", company: "Urban Logistics", rate: "£12 - £15 per hour", experience: "5 years", skills: ["Van", "Parcels", "Furniture"], availability: "Available today", location: "Kings Cross", distance: "1.2 km", coords: { x: 48, y: 35 }, rating: 4.7, reviews: 56, image: "OF" },
    { name: "Daniel Green", profession: "Delivery Driver", company: "Green Delivery Co", rate: "£13 - £16 per hour", experience: "9 years", skills: ["Electric Van", "Eco Friendly", "Multi-drop"], availability: "Available now", location: "Angel", distance: "0.8 km", coords: { x: 52, y: 36 }, rating: 4.9, reviews: 94, image: "DG" },
  ],
  "Carpenter": [
    { name: "Steve Miller", profession: "Master Carpenter", company: "Miller Carpentry", rate: "£190 - £260 per day", experience: "15 years", skills: ["Bespoke", "Fitted", "Restoration"], availability: "Available in 1 week", location: "Hackney", distance: "2.6 km", coords: { x: 60, y: 39 }, rating: 4.9, reviews: 134, image: "SM" },
    { name: "Tony Edwards", profession: "Carpenter", company: "Self-employed", rate: "£175 - £240 per day", experience: "12 years", skills: ["Kitchens", "Wardrobes", "Doors"], availability: "Available now", location: "Shoreditch", distance: "2.1 km", coords: { x: 58, y: 41 }, rating: 4.8, reviews: 98, image: "TE" },
    { name: "Chris Palmer", profession: "Joiner & Carpenter", company: "Palmer Joinery", rate: "£200 - £275 per day", experience: "18 years", skills: ["Stairs", "Windows", "Flooring"], availability: "Available now", location: "Islington", distance: "1.4 km", coords: { x: 49, y: 35 }, rating: 5.0, reviews: 187, image: "CP" },
    { name: "Martin Shaw", profession: "Carpenter", company: "Bespoke Wood Ltd", rate: "£180 - £250 per day", experience: "10 years", skills: ["Shelving", "Cabinets", "Decking"], availability: "Available now", location: "Camden", distance: "1.7 km", coords: { x: 47, y: 38 }, rating: 4.7, reviews: 76, image: "MS" },
    { name: "Ian Foster", profession: "Carpenter", company: "Self-employed", rate: "£170 - £235 per day", experience: "11 years", skills: ["Repairs", "Fitting", "Skirting"], availability: "Available today", location: "Old Street", distance: "2.0 km", coords: { x: 54, y: 43 }, rating: 4.6, reviews: 65, image: "IF" },
    { name: "Peter Collins", profession: "Carpenter", company: "Collins Carpentry", rate: "£185 - £255 per day", experience: "14 years", skills: ["Custom", "Built-in", "Pergola"], availability: "Available now", location: "Angel", distance: "1.1 km", coords: { x: 51, y: 37 }, rating: 4.8, reviews: 112, image: "PC" },
    { name: "Rob Harrison", profession: "Carpenter", company: "Harrison & Co", rate: "£195 - £270 per day", experience: "16 years", skills: ["Renovation", "Extensions", "Loft"], availability: "Available in 3 days", location: "Kings Cross", distance: "1.5 km", coords: { x: 48, y: 36 }, rating: 4.9, reviews: 145, image: "RH" },
  ],
}

export default function BannerMap() {
  const [selectedProfession, setSelectedProfession] = useState<string>("Software Engineer")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null)

  const currentProfiles = PROFESSIONS[selectedProfession as keyof typeof PROFESSIONS]

  // Hide BannerMap when search modal opens
  useEffect(() => {
    const handleSearchOpen = () => setIsModalOpen(true)
    const handleSearchClose = () => setIsModalOpen(false)

    window.addEventListener('mainPageSearch', handleSearchOpen)
    window.addEventListener('mainPageSearchClose', handleSearchClose)

    return () => {
      window.removeEventListener('mainPageSearch', handleSearchOpen)
      window.removeEventListener('mainPageSearchClose', handleSearchClose)
    }
  }, [])

  const handleViewProfile = () => {
    setShowOnboarding(true)
  }

  const handleContact = () => {
    setShowOnboarding(true)
  }

  // autoplay loop
  useEffect(() => {
    if (!isAutoPlaying) return

    autoTimerRef.current = setInterval(() => {
      setSelectedIndex((prev) => (prev === null ? 0 : (prev + 1) % currentProfiles.length))
    }, AUTO_ADVANCE_MS)

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [isAutoPlaying, currentProfiles.length])

  // Reset selection when profession changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [selectedProfession])

  const handlePinClick = (index: number) => {
    setSelectedIndex(index)
    setIsAutoPlaying(false)
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    pauseTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true)
    }, AUTO_PAUSE_AFTER_CLICK_MS)
  }

  // Hide BannerMap when modal is open to prevent z-index conflicts
  if (isModalOpen || isBannerDismissed) return null

  return (
    <div className="w-full bg-gradient-to-b from-white to-blue-50/30 py-4 sm:py-6">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              Live Demo · Try different professions
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="absolute top-0 right-0 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            aria-label="Close Live Demo"
          >
            <X className="h-5 w-5 text-gray-600 hover:text-gray-900" />
          </button>

          <Card className="overflow-hidden border-2 shadow-xl">
            {/* Compact Search Bar */}
            <div className="bg-white border-b px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={selectedProfession}
                    onChange={(e) => setSelectedProfession(e.target.value)}
                    className="flex-1 bg-transparent text-gray-700 font-semibold outline-none cursor-pointer text-sm sm:text-base appearance-none"
                    style={{ minWidth: "150px" }}
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Delivery Driver">Delivery Driver</option>
                    <option value="Carpenter">Carpenter</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="hidden sm:flex items-center gap-2 pl-2 border-l-2 border-gray-300">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700 font-medium text-sm">London</span>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium whitespace-nowrap">{currentProfiles.length} results</span>
              </div>
            </div>

            {/* Compact Map View */}
            <div className="relative w-full h-[280px] sm:h-[320px] bg-gray-100">
              {/* London Map Background */}
              <div className="absolute inset-0">
                <img
                  src="/LondonMap.png"
                  alt="London Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/5" />
              </div>

              {/* Professional Pins */}
              <div className="absolute inset-0">
                {currentProfiles.map((profile, i) => {
                  const isSelected = selectedIndex === i
                  return (
                    <button
                      key={i}
                      onClick={() => handlePinClick(i)}
                      className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 hover:scale-125 group ${
                        isSelected ? "z-30" : "z-10"
                      }`}
                      style={{ left: `${profile.coords.x}%`, top: `${profile.coords.y}%` }}
                    >
                      <div className="relative">
                        <MapPin
                          className={`transition-all duration-300 ${
                            isSelected
                              ? "w-8 h-8 text-blue-600 fill-blue-600 drop-shadow-2xl"
                              : "w-5 h-5 text-blue-500 fill-blue-500 drop-shadow-lg"
                          }`}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 animate-ping">
                            <MapPin className="w-8 h-8 text-blue-400 fill-blue-400 opacity-75" />
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                          {profile.name}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Compact Profile Card */}
              {selectedIndex !== null && (
                <div className="absolute inset-x-3 bottom-3 sm:inset-auto sm:top-3 sm:right-3 sm:w-[340px] z-40">
                  <Card className="bg-white/98 backdrop-blur-md shadow-xl border border-gray-200">
                    <div className="p-3.5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0">
                          {currentProfiles[selectedIndex].image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 mb-0.5">
                            {currentProfiles[selectedIndex].name}
                          </h3>
                          <p className="text-xs text-gray-600 mb-1">
                            {currentProfiles[selectedIndex].profession}
                          </p>
                          <p className="text-xs text-gray-500">
                            {currentProfiles[selectedIndex].company}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-bold text-gray-900">
                            {currentProfiles[selectedIndex].rating}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600">
                            {currentProfiles[selectedIndex].rate}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>{currentProfiles[selectedIndex].experience}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs truncate">{currentProfiles[selectedIndex].availability}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{currentProfiles[selectedIndex].location}</span>
                          <span className="text-blue-600 ml-auto whitespace-nowrap text-xs">
                            {currentProfiles[selectedIndex].distance}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {currentProfiles[selectedIndex].skills.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleViewProfile}
                          className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleContact}
                          className="flex-1 h-8 text-xs"
                        >
                          Contact
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Compact Controls */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAutoPlaying((v) => !v)}
                  className="h-7 px-2.5 text-xs bg-white/95 backdrop-blur shadow-md border"
                >
                  {isAutoPlaying ? "⏸" : "▶"}
                </Button>
                <div className="bg-white/95 backdrop-blur px-2 py-1 rounded shadow-md border text-xs font-medium text-gray-700">
                  {selectedIndex !== null ? `${selectedIndex + 1}/${currentProfiles.length}` : "-"}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <OnboardingFlow
              onClose={() => setShowOnboarding(false)}
              initialAction="provider"
            />
          </div>
        </div>
      )}
    </div>
  )
}
