import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/messages/:id/cv
// Redirects to a 2-minute signed link for the CV attached to a vacancy
// application. Only the applicant and the employer (the message's two
// participants) can open it, and only files stored under the sender's folder.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: msg } = await admin
    .from("messages")
    .select("sender_id, recipient_id, message_type, metadata")
    .eq("id", id)
    .maybeSingle()

  const path = (msg?.metadata as { cv_path?: string } | null)?.cv_path
  if (!msg || msg.message_type !== "vacancy_application" || !path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (user.id !== msg.sender_id && user.id !== msg.recipient_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!path.startsWith(`${msg.sender_id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const name = (msg.metadata as { cv_name?: string }).cv_name ?? "CV"
  const { data, error } = await admin.storage.from("vacancy-cvs").createSignedUrl(path, 120, { download: name })
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } })
}
