import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import CompanyDetailView from "@/components/company-detail-view"
import { generateOrganizationSchema } from "@/lib/schema-markup"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: company } = await supabase
    .from("company_profiles")
    .select("company_name, description, location, logo_url")
    .eq("id", id)
    .single()

  if (!company) {
    return { title: "Tradesperson Not Found" }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openjobmarket.com"

  return {
    title: `${company.company_name} in ${company.location} | Open Job Market`,
    description:
      company.description?.substring(0, 160) ||
      `${company.company_name} — tradesperson based in ${company.location}.`,
    openGraph: {
      title: company.company_name,
      description: company.description?.substring(0, 200) || `Tradesperson in ${company.location}`,
      url: `${baseUrl}/professionals/${id}`,
      type: "profile",
      siteName: "Open Job Market",
      images: company.logo_url ? [{ url: company.logo_url }] : undefined,
    },
    twitter: {
      card: "summary",
      title: company.company_name,
      description: company.description?.substring(0, 200) || `Tradesperson in ${company.location}`,
      images: company.logo_url ? [company.logo_url] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  }
}

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: company, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !company) {
    notFound()
  }

  // Get current user
  let user: any = null
  try {
    const { data: authData } = await supabase.auth.getUser()
    user = authData.user ?? null
  } catch {
    // continue without session — page works for anonymous users
  }

  const schemaJson = generateOrganizationSchema({
    id: company.id,
    company_name: company.company_name,
    description: company.description || "",
    location: company.location || "",
    logo_url: company.logo_url,
    website_url: company.website_url,
    average_rating: company.average_rating,
    review_count: company.reviews_count,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      <CompanyDetailView company={company} user={user as any} />
    </>
  )
}
