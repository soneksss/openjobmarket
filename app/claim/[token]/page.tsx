import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ClaimClient from "./claim-client"

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Validate UUID format before hitting the DB
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(token)) redirect("/")

  // Fetch the unclaimed listing (RLS allows anon SELECT where claimed=false)
  const { data: trade } = await supabase
    .from("seeded_trades")
    .select("id, company_name, trade_category, address, postcode, phone, email, claim_token")
    .eq("claim_token", token)
    .eq("claimed", false)
    .single()

  if (!trade) redirect("/")

  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // render as signed-out
  }

  return <ClaimClient trade={trade} token={token} user={user} />
}
