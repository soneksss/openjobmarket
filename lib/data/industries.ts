// Centralized industries data - used across the entire application
// This ensures consistency between profile selection, search, and display

export interface Industry {
  id: string
  icon: string
  title: string
  color: string
  borderColor: string
  hoverColor: string
  subcategories: string[]
}

// Main industries list with all metadata
export const industries: Industry[] = [
  {
    id: "electrical-engineering",
    icon: "⚡",
    title: "Electrical & Electronic Engineering",
    color: "from-yellow-500 to-yellow-700",
    borderColor: "border-yellow-500",
    hoverColor: "hover:border-yellow-600",
    subcategories: [
      "Electrician",
      "Fire Alarm Technician",
      "Solar Electrician",
      "Electrical Engineer",
      "Industrial Electrician",
    ],
  },
  {
    id: "plumbing-heating",
    icon: "🛠️",
    title: "Plumbing & Heating",
    color: "from-blue-500 to-blue-700",
    borderColor: "border-blue-500",
    hoverColor: "hover:border-blue-600",
    subcategories: [
      "Plumber",
      "Gas Engineer",
      "Heating Engineer",
      "Boiler Technician",
      "Pipe Fitter",
      "Underfloor Heating Specialist",
    ],
  },
  {
    id: "construction-renovation",
    icon: "🧱",
    title: "Construction & Renovation",
    color: "from-orange-500 to-orange-700",
    borderColor: "border-orange-500",
    hoverColor: "hover:border-orange-600",
    subcategories: [
      "Builder",
      "General Contractor",
      "Roofer",
      "Carpenter",
      "Bricklayer",
      "Tiler",
      "Painter & Decorator",
      "Flooring Specialist",
      "Kitchen Fitter",
      "Bathroom Fitter",
      "Window Installer",
      "Loft Conversion Specialist",
      "Extension Specialist",
      "Insulation Installer",
    ],
  },
  {
    id: "plastering-rendering",
    icon: "🪣",
    title: "Plastering & Rendering",
    color: "from-amber-500 to-amber-700",
    borderColor: "border-amber-500",
    hoverColor: "hover:border-amber-600",
    subcategories: [
      "Plasterer",
      "Rendering Specialist",
      "Dry Lining",
      "Skimming",
      "Coving Specialist",
    ],
  },
  {
    id: "transportation-delivery",
    icon: "🚚",
    title: "Transportation & Delivery",
    color: "from-green-500 to-green-700",
    borderColor: "border-green-500",
    hoverColor: "hover:border-green-600",
    subcategories: [
      "Man & Van",
      "Furniture Removal",
      "Courier",
      "House Clearance",
      "Junk Removal",
      "Moving Services",
    ],
  },
  {
    id: "gardening-landscaping",
    icon: "🌿",
    title: "Gardening & Landscaping",
    color: "from-emerald-500 to-emerald-700",
    borderColor: "border-emerald-500",
    hoverColor: "hover:border-emerald-600",
    subcategories: [
      "Gardener",
      "Landscaper",
      "Tree Surgeon",
      "Lawn Care Specialist",
      "Fence Installer",
      "Patio & Paving Specialist",
    ],
  },
  {
    id: "cleaning-maintenance",
    icon: "🧹",
    title: "Cleaning & Maintenance",
    color: "from-purple-500 to-purple-700",
    borderColor: "border-purple-500",
    hoverColor: "hover:border-purple-600",
    subcategories: [
      "Domestic Cleaner",
      "End of Tenancy Cleaner",
      "Commercial Cleaner",
      "Handyman",
      "Pressure Washing",
      "Property Maintenance",
    ],
  },
  {
    id: "hospitality-catering",
    icon: "🏨",
    title: "Hospitality & Catering",
    color: "from-pink-500 to-pink-700",
    borderColor: "border-pink-500",
    hoverColor: "hover:border-pink-600",
    subcategories: [
      "Private Chef",
      "Catering Services",
      "Event Staff",
      "Mobile Bar Services",
    ],
  },
  {
    id: "technology-it",
    icon: "💻",
    title: "Technology & IT",
    color: "from-indigo-500 to-indigo-700",
    borderColor: "border-indigo-500",
    hoverColor: "hover:border-indigo-600",
    subcategories: [
      "IT Support",
      "Network Technician",
      "Smart Home Installer",
      "CCTV Installer",
      "AV Installer",
    ],
  },
  {
    id: "healthcare-medical",
    icon: "🩺",
    title: "Healthcare & Medical",
    color: "from-red-500 to-red-700",
    borderColor: "border-red-500",
    hoverColor: "hover:border-red-600",
    subcategories: [
      "Home Care Assistant",
      "Private Nurse",
      "Physiotherapist",
      "Personal Support Worker",
    ],
  },
  {
    id: "automotive",
    icon: "🚗",
    title: "Automotive & Mechanical",
    color: "from-gray-600 to-gray-800",
    borderColor: "border-gray-600",
    hoverColor: "hover:border-gray-700",
    subcategories: [
      "Mobile Mechanic",
      "Car Detailing",
      "Auto Electrician",
      "Windscreen Repair",
      "Tyre Fitting",
    ],
  },
  {
    id: "beauty-wellness",
    icon: "💅",
    title: "Beauty & Wellness",
    color: "from-rose-500 to-rose-700",
    borderColor: "border-rose-500",
    hoverColor: "hover:border-rose-600",
    subcategories: [
      "Mobile Hairdresser",
      "Beauty Therapist",
      "Massage Therapist",
      "Personal Trainer",
      "Nail Technician",
    ],
  },
  {
    id: "education-tutoring",
    icon: "📚",
    title: "Education & Training",
    color: "from-yellow-500 to-yellow-700",
    borderColor: "border-yellow-500",
    hoverColor: "hover:border-yellow-600",
    subcategories: [
      "Private Tutor",
      "Music Teacher",
      "Language Teacher",
      "Sports Coach",
      "Driving Instructor",
    ],
  },
  {
    id: "security",
    icon: "🔒",
    title: "Security & Safety",
    color: "from-slate-600 to-slate-800",
    borderColor: "border-slate-600",
    hoverColor: "hover:border-slate-700",
    subcategories: [
      "Security Guard",
      "Locksmith",
      "Alarm Installation",
      "Security Consultant",
    ],
  },
  {
    id: "photography-media",
    icon: "📸",
    title: "Photography & Media",
    color: "from-violet-500 to-violet-700",
    borderColor: "border-violet-500",
    hoverColor: "hover:border-violet-600",
    subcategories: [
      "Photographer",
      "Videographer",
      "Drone Operator",
      "Video Editor",
      "Graphic Designer",
    ],
  },
  {
    id: "event-entertainment",
    icon: "🎉",
    title: "Event & Entertainment",
    color: "from-fuchsia-500 to-fuchsia-700",
    borderColor: "border-fuchsia-500",
    hoverColor: "hover:border-fuchsia-600",
    subcategories: [
      "DJ",
      "Event Planner",
      "Entertainer",
      "Magician",
      "Face Painter",
    ],
  },
  {
    id: "professional-services",
    icon: "💼",
    title: "Professional Services",
    color: "from-cyan-500 to-cyan-700",
    borderColor: "border-cyan-500",
    hoverColor: "hover:border-cyan-600",
    subcategories: [
      "Accountant",
      "Solicitor",
      "Financial Advisor",
      "Consultant",
      "Virtual Assistant",
    ],
  },
  {
    id: "real-estate",
    icon: "🏠",
    title: "Real Estate & Property",
    color: "from-amber-500 to-amber-700",
    borderColor: "border-amber-500",
    hoverColor: "hover:border-amber-600",
    subcategories: [
      "Estate Agent",
      "Property Manager",
      "Surveyor",
      "Letting Agent",
    ],
  },
]

// Simple list of industry titles for dropdowns
export const industryTitles = industries.map(ind => ind.title)

// Get all subcategories flattened (for search matching)
export const allSubcategories = industries.flatMap(ind => ind.subcategories)

// Get industry by title (case-insensitive partial match for search)
export function findIndustryByTitle(title: string): Industry | undefined {
  const lowerTitle = title.toLowerCase()
  return industries.find(ind =>
    ind.title.toLowerCase() === lowerTitle ||
    ind.title.toLowerCase().includes(lowerTitle) ||
    lowerTitle.includes(ind.title.toLowerCase())
  )
}

// Get industry that contains a subcategory
export function findIndustryBySubcategory(subcategory: string): Industry | undefined {
  const lowerSub = subcategory.toLowerCase()
  return industries.find(ind =>
    ind.subcategories.some(sub => sub.toLowerCase() === lowerSub)
  )
}

// Check if a search term matches an industry or its subcategories
export function matchesIndustry(searchTerm: string, industryTitle: string): boolean {
  const lowerSearch = searchTerm.toLowerCase()
  const lowerTitle = industryTitle.toLowerCase()

  // Direct title match
  if (lowerTitle.includes(lowerSearch) || lowerSearch.includes(lowerTitle)) {
    return true
  }

  // Check if search matches subcategories of this industry
  const industry = industries.find(ind => ind.title.toLowerCase() === lowerTitle)
  if (industry) {
    return industry.subcategories.some(sub =>
      sub.toLowerCase().includes(lowerSearch) || lowerSearch.includes(sub.toLowerCase())
    )
  }

  return false
}
