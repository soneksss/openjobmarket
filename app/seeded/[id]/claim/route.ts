import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

export const dynamic = "force-dynamic"

/**
 * GET /seeded/[id]/claim
 *
 * Sends a visitor from a listing page to its claim page, so the token isn't
 * embedded in every public listing page. claim_seeded_business() is what
 * authorises the claim, by checking the caller owns the listing's email.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data } = await createAdminClient()
    .from("seeded_trades")
    .select("claim_token")
    .eq("id", id)
    .eq("claimed", false)
    .maybeSingle()

  const path = data?.claim_token ? `/claim/${data.claim_token}` : "/find-trades"
  return NextResponse.redirect(new URL(path, req.url))
}
