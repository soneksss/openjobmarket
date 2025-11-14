// Location service for geocoding addresses and managing location data

export interface LocationData {
  address: string
  latitude: number
  longitude: number
  city: string
  country: string
  formatted_address: string
}

// Predefined coordinates for known addresses to avoid API calls
const KNOWN_LOCATIONS: Record<string, LocationData> = {
  // San Francisco Bay Area
  "101 California Street, San Francisco, CA 94111, USA": {
    address: "101 California Street, San Francisco, CA 94111, USA",
    latitude: 37.7929,
    longitude: -122.3997,
    city: "San Francisco",
    country: "USA",
    formatted_address: "101 California Street, San Francisco, CA 94111, USA"
  },
  "1 Market Street, San Francisco, CA 94105, USA": {
    address: "1 Market Street, San Francisco, CA 94105, USA",
    latitude: 37.7939,
    longitude: -122.3957,
    city: "San Francisco",
    country: "USA",
    formatted_address: "1 Market Street, San Francisco, CA 94105, USA"
  },
  "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA": {
    address: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
    latitude: 37.4220,
    longitude: -122.0841,
    city: "Mountain View",
    country: "USA",
    formatted_address: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
  },
  "One Apple Park Way, Cupertino, CA 95014, USA": {
    address: "One Apple Park Way, Cupertino, CA 95014, USA",
    latitude: 37.3349,
    longitude: -122.0090,
    city: "Cupertino",
    country: "USA",
    formatted_address: "One Apple Park Way, Cupertino, CA 95014, USA"
  },
  "1 Hacker Way, Menlo Park, CA 94301, USA": {
    address: "1 Hacker Way, Menlo Park, CA 94301, USA",
    latitude: 37.4849,
    longitude: -122.1477,
    city: "Menlo Park",
    country: "USA",
    formatted_address: "1 Hacker Way, Menlo Park, CA 94301, USA"
  },

  // New York
  "1 World Trade Center, New York, NY 10007, USA": {
    address: "1 World Trade Center, New York, NY 10007, USA",
    latitude: 40.7127,
    longitude: -74.0134,
    city: "New York",
    country: "USA",
    formatted_address: "1 World Trade Center, New York, NY 10007, USA"
  },
  "350 5th Avenue, New York, NY 10118, USA": {
    address: "350 5th Avenue, New York, NY 10118, USA",
    latitude: 40.7484,
    longitude: -73.9857,
    city: "New York",
    country: "USA",
    formatted_address: "350 5th Avenue, New York, NY 10118, USA"
  },

  // Seattle
  "410 Terry Avenue North, Seattle, WA 98109, USA": {
    address: "410 Terry Avenue North, Seattle, WA 98109, USA",
    latitude: 47.6219,
    longitude: -122.3365,
    city: "Seattle",
    country: "USA",
    formatted_address: "410 Terry Avenue North, Seattle, WA 98109, USA"
  },
  "1 Microsoft Way, Redmond, WA 98052, USA": {
    address: "1 Microsoft Way, Redmond, WA 98052, USA",
    latitude: 47.6397,
    longitude: -122.1297,
    city: "Redmond",
    country: "USA",
    formatted_address: "1 Microsoft Way, Redmond, WA 98052, USA"
  },

  // Austin
  "100 Congress Avenue, Austin, TX 78701, USA": {
    address: "100 Congress Avenue, Austin, TX 78701, USA",
    latitude: 30.2672,
    longitude: -97.7431,
    city: "Austin",
    country: "USA",
    formatted_address: "100 Congress Avenue, Austin, TX 78701, USA"
  },

  // London
  "1 Canada Square, London E14 5AB, UK": {
    address: "1 Canada Square, London E14 5AB, UK",
    latitude: 51.5054,
    longitude: -0.0196,
    city: "London",
    country: "UK",
    formatted_address: "1 Canada Square, London E14 5AB, UK"
  },
  "30 St Mary Axe, London EC3A 8EP, UK": {
    address: "30 St Mary Axe, London EC3A 8EP, UK",
    latitude: 51.5144,
    longitude: -0.0805,
    city: "London",
    country: "UK",
    formatted_address: "30 St Mary Axe, London EC3A 8EP, UK"
  },

  // Berlin
  "Potsdamer Platz 1, 10785 Berlin, Germany": {
    address: "Potsdamer Platz 1, 10785 Berlin, Germany",
    latitude: 52.5096,
    longitude: 13.3762,
    city: "Berlin",
    country: "Germany",
    formatted_address: "Potsdamer Platz 1, 10785 Berlin, Germany"
  },

  // Amsterdam
  "Gustav Mahlerlaan 1, 1082 MM Amsterdam, Netherlands": {
    address: "Gustav Mahlerlaan 1, 1082 MM Amsterdam, Netherlands",
    latitude: 52.3386,
    longitude: 4.8721,
    city: "Amsterdam",
    country: "Netherlands",
    formatted_address: "Gustav Mahlerlaan 1, 1082 MM Amsterdam, Netherlands"
  },

  // Toronto
  "100 King Street West, Toronto, ON M5X 1C7, Canada": {
    address: "100 King Street West, Toronto, ON M5X 1C7, Canada",
    latitude: 43.6481,
    longitude: -79.3809,
    city: "Toronto",
    country: "Canada",
    formatted_address: "100 King Street West, Toronto, ON M5X 1C7, Canada"
  },

  // Sydney
  "Level 1, 1 Martin Place, Sydney NSW 2000, Australia": {
    address: "Level 1, 1 Martin Place, Sydney NSW 2000, Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    city: "Sydney",
    country: "Australia",
    formatted_address: "Level 1, 1 Martin Place, Sydney NSW 2000, Australia"
  }
}

/**
 * Get location data for a given address
 * First checks known locations, then falls back to geocoding
 */
export async function getLocationData(address: string): Promise<LocationData | null> {
  try {
    // Check if we have this address in our known locations
    const knownLocation = KNOWN_LOCATIONS[address]
    if (knownLocation) {
      return knownLocation
    }

    // For unknown addresses, try to parse basic information
    const locationData = parseAddressBasic(address)
    if (locationData) {
      return locationData
    }

    console.warn(`Location data not found for address: ${address}`)
    return null
  } catch (error) {
    console.error('Error getting location data:', error)
    return null
  }
}

/**
 * Basic address parser for unknown addresses
 * Extracts city and country information
 */
function parseAddressBasic(address: string): LocationData | null {
  try {
    const parts = address.split(',').map(part => part.trim())

    if (parts.length < 2) {
      return null
    }

    let city = ''
    let country = ''

    // Try to identify country
    const lastPart = parts[parts.length - 1].toLowerCase()
    if (lastPart.includes('usa') || lastPart.includes('united states')) {
      country = 'USA'
      // For US addresses, city is usually the second-to-last part
      if (parts.length >= 3) {
        city = parts[parts.length - 3]
      }
    } else if (lastPart.includes('uk') || lastPart.includes('united kingdom')) {
      country = 'UK'
      city = parts[parts.length - 2] || parts[0]
    } else if (lastPart.includes('canada')) {
      country = 'Canada'
      if (parts.length >= 3) {
        city = parts[parts.length - 3]
      }
    } else if (lastPart.includes('germany')) {
      country = 'Germany'
      city = parts[parts.length - 2] || parts[0]
    } else if (lastPart.includes('netherlands')) {
      country = 'Netherlands'
      city = parts[parts.length - 2] || parts[0]
    } else if (lastPart.includes('australia')) {
      country = 'Australia'
      city = parts[parts.length - 2] || parts[0]
    } else {
      // Assume last part is country, second-to-last is city
      country = parts[parts.length - 1]
      city = parts[parts.length - 2] || parts[0]
    }

    // Generate approximate coordinates based on city
    const coordinates = getApproximateCoordinates(city, country)

    return {
      address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: city,
      country: country,
      formatted_address: address
    }
  } catch (error) {
    console.error('Error parsing address:', error)
    return null
  }
}

/**
 * Get approximate coordinates for major cities
 */
function getApproximateCoordinates(city: string, country: string): { latitude: number; longitude: number } {
  const cityLower = city.toLowerCase()
  const countryLower = country.toLowerCase()

  // Major city coordinates
  const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
    'san francisco': { latitude: 37.7749, longitude: -122.4194 },
    'new york': { latitude: 40.7128, longitude: -74.0060 },
    'seattle': { latitude: 47.6062, longitude: -122.3321 },
    'austin': { latitude: 30.2672, longitude: -97.7431 },
    'chicago': { latitude: 41.8781, longitude: -87.6298 },
    'los angeles': { latitude: 34.0522, longitude: -118.2437 },
    'boston': { latitude: 42.3601, longitude: -71.0589 },
    'denver': { latitude: 39.7392, longitude: -104.9903 },
    'london': { latitude: 51.5074, longitude: -0.1278 },
    'berlin': { latitude: 52.5200, longitude: 13.4050 },
    'amsterdam': { latitude: 52.3676, longitude: 4.9041 },
    'toronto': { latitude: 43.6532, longitude: -79.3832 },
    'sydney': { latitude: -33.8688, longitude: 151.2093 },
    'tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'paris': { latitude: 48.8566, longitude: 2.3522 },
    'madrid': { latitude: 40.4168, longitude: -3.7038 },
    'rome': { latitude: 41.9028, longitude: 12.4964 },
    'zurich': { latitude: 47.3769, longitude: 8.5417 },
    'stockholm': { latitude: 59.3293, longitude: 18.0686 },
    'copenhagen': { latitude: 55.6761, longitude: 12.5683 },
  }

  const coordinates = cityCoordinates[cityLower]
  if (coordinates) {
    return coordinates
  }

  // Default coordinates by country
  const countryDefaults: Record<string, { latitude: number; longitude: number }> = {
    'usa': { latitude: 39.8283, longitude: -98.5795 },
    'uk': { latitude: 55.3781, longitude: -3.4360 },
    'canada': { latitude: 56.1304, longitude: -106.3468 },
    'germany': { latitude: 51.1657, longitude: 10.4515 },
    'netherlands': { latitude: 52.1326, longitude: 5.2913 },
    'australia': { latitude: -25.2744, longitude: 133.7751 },
    'france': { latitude: 46.6034, longitude: 1.8883 },
  }

  return countryDefaults[countryLower] || { latitude: 0, longitude: 0 }
}

/**
 * Validate if an address has sufficient location data for mapping
 */
export function isValidLocationForMapping(locationData: LocationData | null): boolean {
  if (!locationData) return false

  return (
    locationData.latitude !== 0 &&
    locationData.longitude !== 0 &&
    locationData.city.length > 0 &&
    locationData.country.length > 0
  )
}