export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import SeededDetailView from "@/components/seeded-detail-view"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data } = await supabase
    .from("seeded_trades")
    .select("company_name, trade_category, address, postcode")
    .eq("id", id)
    .eq("claimed", false)
    .single()

  if (!data) return { title: "Business Not Found" }

  const location = [data.address, data.postcode].filter(Boolean).join(", ")
  return {
    title: `${data.company_name}${data.trade_category ? ` - ${data.trade_category}` : ""}${location ? ` in ${location}` : ""} | OpenJobMarket`,
    description: `${data.company_name} is a local ${data.trade_category ?? "trade business"}${location ? ` based in ${location}` : ""}. View contact details or claim this listing on OpenJobMarket.`,
    robots: { index: true, follow: true },
  }
}

export default async function SeededTradePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: trade, error } = await supabase
    .from("seeded_trades")
    .select("id, company_name, trade_category, email, phone, address, postcode, created_at, claim_token")
    .eq("id", id)
    .eq("claimed", false)
    .single()

  if (error || !trade) notFound()

  return <SeededDetailView trade={trade} />
}
