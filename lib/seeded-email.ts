import { createAdminWriteClient } from "@/lib/server"

/**
 * True when an email belongs to an unclaimed seeded listing.
 *
 * Routes that create pre-confirmed accounts must refuse these emails: a claim is
 * authorised by owning the listing's email, so skipping verification would let
 * anyone claim the business. The normal signup flow still verifies them by OTP.
 *
 * Uses the write client because its errors propagate. The read client turns
 * failures into empty results, which would look like "no listing" and let it through.
 */
export async function isUnclaimedListingEmail(email: string): Promise<boolean> {
  const pattern = email.trim().replace(/[\\%_]/g, "\\$&")
  const { data, error } = await createAdminWriteClient()
    .from("seeded_trades")
    .select("id")
    .eq("claimed", false)
    .ilike("email", pattern)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}
