// ============================================================================
// Shared trade industry + service definitions.
// Used by:
//   • Homeowner job posting form (job-wizard-modal.tsx)
//   • Tradesperson profile setup (onboarding-flow.tsx)
//   • Tradesperson profile edit (company-profile-edit-form.tsx)
//   • Job matching / search (main-page-search.tsx)
//
// Service names within each industry MUST stay consistent with
// company_profiles.services[] values so exact matching works.
// ============================================================================

export interface TradeIndustry {
  title: string
  icon: string
  category: string | null  // legacy category value for backward compat
  services: readonly string[]
}

export const TRADE_INDUSTRIES: readonly TradeIndustry[] = [
  {
    title: "Plumbing & Heating",
    icon: "🚰",
    category: "Plumbing",
    services: [
      "Plumber",
      "Gas Engineer",
      "Heating Engineer",
      "Boiler Technician",
      "Boiler Repair",
      "Boiler Installation",
      "Radiator Installation",
      "Leak Repair",
      "Bathroom Plumbing",
      "Underfloor Heating Specialist",
      "Pipe Fitter",
    ],
  },
  {
    title: "Electrical",
    icon: "⚡",
    category: "Electrical",
    services: [
      "Electrician",
      "Solar Electrician",
      "Electrical Engineer",
      "Industrial Electrician",
      "Consumer Unit / Fuse Board",
      "Socket & Switch Installation",
      "Lighting Installation",
      "EV Charger Installation",
      "Rewiring",
      "Fault Finding",
      "Fire Alarm Technician",
    ],
  },
  {
    title: "Construction & Renovation",
    icon: "🧱",
    category: "Construction",
    services: [
      "Builder",
      "General Contractor",
      "Extension Specialist",
      "Loft Conversion Specialist",
      "Bricklayer",
      "Insulation Installer",
      "Glazier",
      "Scaffolder",
      "Welder",
      "Demolition",
    ],
  },
  {
    title: "Plastering & Rendering",
    icon: "🪣",
    category: "Plastering",
    services: [
      "Plasterer",
      "Rendering Specialist",
      "Dry Lining",
      "Skimming",
      "Coving Specialist",
    ],
  },
  {
    title: "Painting & Decorating",
    icon: "🎨",
    category: "Painting & Decorating",
    services: [
      "Painter & Decorator",
      "Interior Painting",
      "Exterior Painting",
      "Wallpapering",
      "Coving & Cornicing",
    ],
  },
  {
    title: "Roofing",
    icon: "🏠",
    category: "Roofing",
    services: [
      "Roofer",
      "Flat Roofing",
      "Roof Repair",
      "Guttering",
      "Fascia & Soffit",
      "Chimney Work",
    ],
  },
  {
    title: "Carpentry & Joinery",
    icon: "🪵",
    category: "Carpentry",
    services: [
      "Carpenter",
      "Joiner",
      "Kitchen Fitter",
      "Bathroom Fitter",
      "Door Fitting",
      "Window Fitting",
      "Window Installer",
      "Staircase Work",
      "Built-in Furniture",
      "Decking",
    ],
  },
  {
    title: "Gardening & Landscaping",
    icon: "🌿",
    category: "Gardening",
    services: [
      "Gardener",
      "Landscaper",
      "Tree Surgeon",
      "Lawn Care Specialist",
      "Patio & Paving Specialist",
      "Fence Installer",
    ],
  },
  {
    title: "Flooring & Tiling",
    icon: "🔲",
    category: "Flooring",
    services: [
      "Flooring Specialist",
      "Tiler",
      "Carpet Fitting",
      "Laminate Flooring",
      "Hardwood Flooring",
      "Bathroom Tiling",
      "Kitchen Tiling",
    ],
  },
  {
    title: "Cleaning",
    icon: "🧹",
    category: "Cleaning",
    services: [
      "Domestic Cleaner",
      "End of Tenancy Cleaner",
      "Commercial Cleaner",
      "Carpet & Upholstery Cleaning",
      "Pressure Washing",
      "Property Maintenance",
      "Chimney Sweep",
      "Gutter Cleaning",
    ],
  },
  {
    title: "Handyman / Small Jobs",
    icon: "🔧",
    category: "General Handyman",
    services: [
      "Handyman",
      "General Handyman",
      "General Repairs",
      "Furniture Assembly",
      "Odd Jobs",
      "Locksmith",
    ],
  },
  {
    title: "Moving & Transport",
    icon: "🚚",
    category: "Transport",
    services: [
      "Man & Van",
      "Furniture Removal",
      "House Moves",
      "Office Relocation",
      "Moving Services",
      "Piano Moving",
      "Courier",
    ],
  },
  {
    title: "Waste Removal",
    icon: "🚛",
    category: "Waste",
    services: [
      "House Clearance",
      "Junk Removal",
      "Garden Waste Removal",
      "Skip Hire",
      "Rubbish Removal",
    ],
  },
  {
    title: "Fencing & Gates",
    icon: "🪧",
    category: "Carpentry",
    services: [
      "Fence Installer",
      "Gate Installation",
      "Fence Repair",
      "Fencing",
    ],
  },
  {
    title: "Windows & Glazing",
    icon: "🪟",
    category: "Windows",
    services: [
      "Window Installer",
      "Window Fitter",
      "Window Repair",
      "Double Glazing",
      "UPVC Windows",
      "Sash Window Specialist",
      "Secondary Glazing",
      "Glazier",
      "Conservatory Installation",
    ],
  },
  {
    title: "Air Conditioning & Ventilation",
    icon: "❄️",
    category: "HVAC",
    services: [
      "Air Conditioning Installation",
      "Air Conditioning Repair",
      "Air Conditioning Service",
      "Ventilation Systems",
      "Heat Pump Installation",
      "Commercial HVAC Systems",
    ],
  },
  {
    title: "Not sure / Other",
    icon: "❓",
    category: null,
    services: [],
  },
] as const

// Quick lookup: industry title → TradeIndustry object
export function findTradeIndustry(title: string): TradeIndustry | undefined {
  return TRADE_INDUSTRIES.find(i => i.title === title)
}

// All unique service names across all industries (for search matching)
export const ALL_TRADE_SERVICES: string[] = [
  ...new Set(TRADE_INDUSTRIES.flatMap(i => [...i.services])),
]

// Industry title → legacy category (for backward compat with jobs.category column)
export const INDUSTRY_TO_CATEGORY: Record<string, string | null> = Object.fromEntries(
  TRADE_INDUSTRIES.map(i => [i.title, i.category])
)
