/**
 * SEO Keywords and Phrases for OpenJobMarket
 * These keywords are used across the site for search engine optimization
 */

export const primaryKeywords = [
  // General Job Search
  "jobs near me",
  "find jobs near me",
  "local jobs",
  "job search",
  "job vacancies",
  "employment opportunities",
  "career opportunities",
  "hiring near me",
  "work near me",

  // Map-Based Search
  "map based job search",
  "jobs on map",
  "find jobs on map",
  "interactive job map",
  "location based jobs",
  "geographic job search",

  // Trade & Professional Services
  "plumber near me",
  "electrician near me",
  "carpenter near me",
  "builder near me",
  "painter near me",
  "roofer near me",
  "handyman near me",
  "contractor near me",
  "available plumber",
  "available electrician",
  "available carpenter",
  "emergency plumber",
  "emergency electrician",
  "local tradespeople",
  "find tradesperson",
  "hire tradesperson",

  // Professional Services
  "programmer job",
  "developer jobs",
  "software engineer jobs",
  "web developer jobs",
  "IT jobs",
  "tech jobs",
  "designer jobs",
  "marketing jobs",
  "accountant jobs",
  "nurse jobs",

  // Remote & Flexible Work
  "remote jobs",
  "work from home jobs",
  "freelance jobs",
  "freelancer opportunities",
  "flexible jobs",
  "part time jobs",
  "full time jobs",
  "contract jobs",
  "temporary jobs",

  // Experience Level
  "no experience jobs",
  "entry level jobs",
  "no experience remote jobs",
  "junior jobs",
  "senior jobs",
  "graduate jobs",
  "apprenticeships",
  "training provided jobs",

  // Location-Based (UK)
  "jobs in London",
  "jobs in Manchester",
  "jobs in Birmingham",
  "jobs in Leeds",
  "jobs in Glasgow",
  "jobs in Liverpool",
  "jobs in Edinburgh",
  "jobs in Bristol",
  "jobs in UK",
  "UK jobs",

  // Job Actions
  "post job",
  "post vacancy",
  "advertise job",
  "hire employees",
  "find employees",
  "recruit staff",
  "post small job",
  "quick hire",

  // Comparison & Search
  "compare jobs",
  "compare vacancies",
  "compare salaries",
  "compare tradespeople",
  "find best job",
  "job comparison",

  // Job Types
  "hourly jobs",
  "daily jobs",
  "weekend jobs",
  "evening jobs",
  "shift work",
  "casual jobs",
  "seasonal jobs",

  // Specific Sectors
  "construction jobs",
  "healthcare jobs",
  "retail jobs",
  "hospitality jobs",
  "education jobs",
  "engineering jobs",
  "finance jobs",
  "admin jobs",
  "customer service jobs",
  "warehouse jobs",
  "delivery jobs",
  "driver jobs",
]

export const longTailKeywords = [
  "how to find jobs near me",
  "best job search website",
  "local job opportunities in my area",
  "emergency plumber available now",
  "hire electrician same day",
  "remote jobs no experience required",
  "work from home jobs UK",
  "freelance jobs for beginners",
  "compare job offers online",
  "post job vacancy free",
  "find local tradespeople",
  "verified tradesperson near me",
  "jobs with training provided",
  "immediate start jobs",
  "walk in interviews near me",
]

export const locationKeywords = [
  "near me",
  "in my area",
  "local",
  "nearby",
]

export const tradeCategories = [
  "plumber",
  "electrician",
  "carpenter",
  "builder",
  "painter",
  "decorator",
  "roofer",
  "bricklayer",
  "plasterer",
  "tiler",
  "landscaper",
  "handyman",
]

export const professionalCategories = [
  "programmer",
  "developer",
  "designer",
  "engineer",
  "accountant",
  "nurse",
  "teacher",
  "manager",
  "consultant",
  "analyst",
]

/**
 * Generate SEO-friendly combinations of keywords
 */
export function generateKeywordCombinations() {
  const combinations: string[] = []

  // Trade + Location combinations
  tradeCategories.forEach(trade => {
    locationKeywords.forEach(location => {
      combinations.push(`${trade} ${location}`)
      combinations.push(`find ${trade} ${location}`)
      combinations.push(`hire ${trade} ${location}`)
      combinations.push(`available ${trade} ${location}`)
    })
  })

  // Professional + Job combinations
  professionalCategories.forEach(profession => {
    combinations.push(`${profession} job`)
    combinations.push(`${profession} jobs`)
    combinations.push(`${profession} vacancy`)
    combinations.push(`${profession} vacancies`)
    combinations.push(`remote ${profession} jobs`)
  })

  return combinations
}

/**
 * Get all keywords as a single array
 */
export function getAllKeywords(): string[] {
  return [
    ...primaryKeywords,
    ...longTailKeywords,
    ...generateKeywordCombinations()
  ]
}
