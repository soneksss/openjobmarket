import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import CompanyDetailView from "@/components/company-detail-view"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: company } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (!company) {
    return {
      title: "Company Not Found",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  return {
    title: `${company.company_name} - ${company.industry} in ${company.location} | OpenJobMarket`,
    description: `${company.description?.substring(0, 150) || `${company.company_name} - ${company.industry} company based in ${company.location}`}`,
    keywords: [
      company.company_name,
      company.industry,
      company.location,
      company.company_size,
    ].filter(Boolean),
    openGraph: {
      title: `${company.company_name} - ${company.industry}`,
      description: company.description?.substring(0, 200) || `${company.industry} company in ${company.location}`,
      url: `${baseUrl}/companies/${id}`,
      type: "website",
      siteName: "OpenJobMarket",
      images: company.logo_url ? [{ url: company.logo_url }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${company.company_name} - ${company.industry}`,
      description: company.description?.substring(0, 200) || `${company.industry} company in ${company.location}`,
      images: company.logo_url ? [company.logo_url] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  console.log("[COMPANY-DETAIL] Loading company detail page:", { companyId: id })

  // Get company profile details
  const { data: company, error: companyError } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (companyError) {
    console.error("[COMPANY-DETAIL] Error fetching company:", companyError)
    notFound()
  }

  if (!company) {
    console.log("[COMPANY-DETAIL] Company not found")
    notFound()
  }

  // Get user for authentication check
  const { data: { user } } = await supabase.auth.getUser()

  console.log("[COMPANY-DETAIL] Company found:", {
    id: company.id,
    name: company.company_name,
    industry: company.industry,
  })

  return <CompanyDetailView company={company} user={user as any} />
}
