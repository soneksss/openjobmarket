// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js"
import { getAdminUser } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

/**
 * Admin API endpoint for user distribution by region
 * Returns aggregated counts by country (no individual user data)
 *
 * Response format:
 * {
 *   byCountry: [
 *     { country_code: "BR", country_name: "Brazil", count: 1245 },
 *     { country_code: "GB", country_name: "United Kingdom", count: 842 }
 *   ],
 *   clusters: [
 *     { lat: -23.55, lng: -46.63, count: 430, country: "Brazil" }
 *   ],
 *   totalWithLocation: 2450,
 *   totalWithoutLocation: 150
 * }
 */
export async function GET() {
  try {
    console.log("[ANALYTICS-REGION-API] Users by region endpoint called")

    // Check if user is admin
    const adminUser = await getAdminUser()
    if (!adminUser) {
      console.error("[ANALYTICS-REGION-API] Access denied - not an admin user")
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log("[ANALYTICS-REGION-API] Admin user verified:", adminUser.email)

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[ANALYTICS-REGION-API] Missing required environment variables")
      return NextResponse.json(
        {
          error: "Configuration error",
          byCountry: [],
          clusters: [],
          totalWithLocation: 0,
          totalWithoutLocation: 0
        },
        { status: 500 }
      )
    }

    // Create server-side Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log("[ANALYTICS-REGION-API] Fetching user location data...")

    // Get aggregated data by country (only for users with country_code)
    const { data: countryData, error: countryError } = await supabase
      .from("users")
      .select("country_code, country_name")
      .not("country_code", "is", null)

    if (countryError) {
      console.error("[ANALYTICS-REGION-API] Country query error:", countryError)
      return NextResponse.json(
        { error: "Database error", details: countryError },
        { status: 500 }
      )
    }

    // Aggregate by country
    const countryMap = new Map<string, { country_code: string; country_name: string; count: number }>()

    countryData?.forEach(user => {
      const key = user.country_code!
      if (countryMap.has(key)) {
        countryMap.get(key)!.count++
      } else {
        countryMap.set(key, {
          country_code: user.country_code!,
          country_name: user.country_name || user.country_code!,
          count: 1
        })
      }
    })

    // Convert to array and sort by count (descending)
    const byCountry = Array.from(countryMap.values())
      .sort((a, b) => b.count - a.count)

    console.log("[ANALYTICS-REGION-API] Country aggregation complete:", {
      uniqueCountries: byCountry.length,
      totalUsersWithCountry: countryData?.length || 0
    })

    // Get coordinates for map clustering (sample approach - round to ~25km grid)
    const { data: coordData, error: coordError } = await supabase
      .from("users")
      .select("latitude, longitude, country_name")
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (coordError) {
      console.error("[ANALYTICS-REGION-API] Coordinates query error:", coordError)
    }

    // Create map clusters by rounding coordinates to ~0.25 degree precision (~25km)
    const clusterMap = new Map<string, { lat: number; lng: number; count: number; country: string }>()

    coordData?.forEach(user => {
      if (user.latitude && user.longitude) {
        // Round to 0.25 degree precision for clustering
        const roundedLat = Math.round(user.latitude * 4) / 4
        const roundedLng = Math.round(user.longitude * 4) / 4
        const key = `${roundedLat},${roundedLng}`

        if (clusterMap.has(key)) {
          clusterMap.get(key)!.count++
        } else {
          clusterMap.set(key, {
            lat: roundedLat,
            lng: roundedLng,
            count: 1,
            country: user.country_name || "Unknown"
          })
        }
      }
    })

    // Convert to array and sort by count (descending)
    const clusters = Array.from(clusterMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100) // Limit to top 100 clusters for performance

    console.log("[ANALYTICS-REGION-API] Map clustering complete:", {
      totalClusters: clusters.length,
      totalUsersWithCoords: coordData?.length || 0
    })

    // Count users with and without location data
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })

    const totalWithLocation = coordData?.length || 0
    const totalWithoutLocation = (totalUsers || 0) - totalWithLocation

    const responseData = {
      byCountry,
      clusters,
      totalWithLocation,
      totalWithoutLocation,
      summary: {
        uniqueCountries: byCountry.length,
        topCountry: byCountry[0]?.country_name || "None",
        topCountryCount: byCountry[0]?.count || 0
      }
    }

    console.log("[ANALYTICS-REGION-API] Response data:", responseData.summary)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error("[ANALYTICS-REGION-API] Critical error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
