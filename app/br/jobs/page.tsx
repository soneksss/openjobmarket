import { createClient } from "@/lib/server"
import { Metadata } from "next"
import JobMapView from "@/components/job-map-view"
import { convertToAnnualSalary, type SalaryFrequency } from "@/lib/salary-utils"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Encontre Vagas Perto de Você | Buscar Empregos no Mapa | OpenJobMarket",
  description:
    "Procure empregos e vagas perto de você. Navegue por milhares de anúncios de emprego em um mapa interativo. Filtre por localização, salário, tipo de trabalho e mais. Encontre sua próxima oportunidade de carreira hoje.",
  keywords: [
    "empregos perto de mim",
    "vagas",
    "buscar emprego",
    "carreiras",
    "emprego",
    "mapa de empregos",
    "encontrar empregos",
    "anúncios de emprego",
  ],
  openGraph: {
    title: "Encontre Vagas Perto de Você | OpenJobMarket",
    description: "Procure empregos e vagas em um mapa interativo. Filtre por localização, salário e tipo de trabalho.",
    type: "website",
    siteName: "OpenJobMarket",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function JobsPageBR() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch vacancy jobs for the BR market map.
  // Filters:
  //   status = 'POSTED'          — state machine active state (was 'open'/'active' pre-migration)
  //   is_tradespeople_job = false — BR market shows vacancy jobs only, not trade/handyman jobs
  //   expires_at IS NULL OR > now() — exclude expired listings
  const now = new Date().toISOString()
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      company:company_profiles!jobs_company_id_fkey (
        id,
        company_name,
        logo_url,
        industry
      )
    `)
    .eq("status", "POSTED")
    .eq("is_tradespeople_job", false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching jobs:", error)
  }

  // Convert jobs to expected format with annual salary
  const formattedJobs = (jobs || []).map(job => ({
    ...job,
    annualSalary: job.budget_min && job.budget_period
      ? convertToAnnualSalary(job.budget_min, job.budget_period as SalaryFrequency)
      : null,
  }))

  return <JobMapView jobs={formattedJobs} user={user} />
}
