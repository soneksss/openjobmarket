import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const zip = searchParams.get("zip")
  const country = searchParams.get("country")

  if (!zip) {
    return NextResponse.json({ error: "ZIP code is required" }, { status: 400 })
  }

  try {
    // Using GeoNames API for postal code lookup
    const response = await fetch(
      `http://api.geonames.org/postalCodeSearchJSON?postalcode=${encodeURIComponent(zip)}&country=${country || "GB"}&maxRows=5&username=demo`,
    )

    const data = await response.json()

    const suggestions =
      data.postalCodes?.map((item: any) => ({
        postalCode: item.postalCode,
        placeName: item.placeName,
        adminName1: item.adminName1,
        countryCode: item.countryCode,
      })) || []

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("GeoNames API error:", error)
    return NextResponse.json({ error: "Failed to fetch location data" }, { status: 500 })
  }
}
