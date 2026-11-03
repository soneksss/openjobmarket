import { createClient, createAdminClient, createAdminWriteClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/vacancies/:id/apply   (multipart: message, cv?)
//
// A vacancy application is a message to the employer, with an optional CV.
// Any personal account can apply — no jobseeker profile or role change needed.
// The CV goes to the private vacancy-cvs bucket; /api/messages/:id/cv hands out
// short-lived links to the applicant and the employer only.

const CV_BUCKET = "vacancy-cvs"
// Vercel functions reject request bodies over ~4.5 MB, so stay under that.
const MAX_CV_BYTES = 4 * 1024 * 1024
const MAX_APPLICATIONS_PER_DAY = 20
const CV_TYPES: Record<string, { mime: string; magic: number[] }> = {
  pdf:  { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },                                           // %PDF
  doc:  { mime: "application/msword", magic: [0xd0, 0xcf, 0x11, 0xe0] },                                         // OLE2
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [0x50, 0x4b] }, // ZIP
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vacancyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Please sign in to apply." }, { status: 401 })

    const form = await request.formData()
    const message = String(form.get("message") ?? "").trim()
    const cv = form.get("cv")
    if (message.length < 10) return NextResponse.json({ error: "Please write a short message to the employer." }, { status: 400 })
    if (message.length > 3000) return NextResponse.json({ error: "Your message is too long (3,000 characters max)." }, { status: 400 })

    const admin = createAdminClient()

    const [{ data: userRow }, { data: vacancy }, { data: enabled }] = await Promise.all([
      admin.from("users").select("user_type").eq("id", user.id).maybeSingle(),
      admin.from("jobs")
        .select("id, title, status, is_active, is_tradespeople_job, expires_at, company_profiles!company_id(user_id, company_name)")
        .eq("id", vacancyId)
        .maybeSingle(),
      admin.rpc("is_vacancy_system_enabled"),
    ])

    if (enabled !== true) return NextResponse.json({ error: "Vacancies are not available right now." }, { status: 403 })
    const employer = (vacancy as any)?.company_profiles as { user_id: string; company_name: string | null } | null
    if (!vacancy || vacancy.is_tradespeople_job !== false || !employer?.user_id) {
      return NextResponse.json({ error: "Vacancy not found." }, { status: 404 })
    }
    if (vacancy.status !== "POSTED" || !vacancy.is_active || (vacancy.expires_at && new Date(vacancy.expires_at) < new Date())) {
      return NextResponse.json({ error: "This vacancy is no longer accepting applications." }, { status: 410 })
    }
    if (employer.user_id === user.id) return NextResponse.json({ error: "You can't apply to your own vacancy." }, { status: 400 })
    if (userRow?.user_type === "company") {
      return NextResponse.json({ error: "Business accounts can't apply. Please use a personal account." }, { status: 403 })
    }

    // One application per vacancy, and a daily cap to stop spam.
    const since = new Date(Date.now() - 864e5).toISOString()
    const [{ count: already }, { count: today }] = await Promise.all([
      admin.from("messages").select("id", { count: "exact", head: true })
        .eq("sender_id", user.id).eq("job_id", vacancyId).eq("message_type", "vacancy_application"),
      admin.from("messages").select("id", { count: "exact", head: true })
        .eq("sender_id", user.id).eq("message_type", "vacancy_application").gte("created_at", since),
    ])
    if ((already ?? 0) > 0) return NextResponse.json({ error: "You've already applied for this vacancy." }, { status: 409 })
    if ((today ?? 0) >= MAX_APPLICATIONS_PER_DAY) {
      return NextResponse.json({ error: "You've reached today's application limit. Please try again tomorrow." }, { status: 429 })
    }

    const write = createAdminWriteClient()

    // ── Optional CV ──
    let cvMeta: { cv_path: string; cv_name: string } | null = null
    if (cv instanceof File && cv.size > 0) {
      if (cv.size > MAX_CV_BYTES) return NextResponse.json({ error: "Your CV must be 4 MB or smaller." }, { status: 400 })
      const ext = cv.name.split(".").pop()?.toLowerCase() ?? ""
      const type = CV_TYPES[ext]
      const bytes = new Uint8Array(await cv.arrayBuffer())
      if (!type || !type.magic.every((b, i) => bytes[i] === b)) {
        return NextResponse.json({ error: "Please attach your CV as a PDF or Word document." }, { status: 400 })
      }
      const path = `${user.id}/${vacancyId}/${Date.now()}.${ext}`
      const { error: uploadError } = await write.storage.from(CV_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false })
      if (uploadError) {
        console.error("[VACANCY APPLY] CV upload failed:", uploadError.message)
        return NextResponse.json({ error: "We couldn't upload your CV. Please try again." }, { status: 500 })
      }
      cvMeta = { cv_path: path, cv_name: cv.name.slice(0, 120) }
    }

    // ── Conversation + message to the employer ──
    const { data: conversationId, error: convError } = await write.rpc("get_or_create_conversation", {
      user1_id:  user.id,
      user2_id:  employer.user_id,
      p_job_id:  vacancyId,
      p_subject: `Application: ${vacancy.title}`,
    })
    if (convError || !conversationId) {
      console.error("[VACANCY APPLY] Conversation error:", convError?.message)
      return NextResponse.json({ error: "Could not send your application. Please try again." }, { status: 500 })
    }

    const { error: msgError } = await write.from("messages").insert({
      sender_id:       user.id,
      recipient_id:    employer.user_id,
      content:         message,
      subject:         `Application: ${vacancy.title}`,
      conversation_id: conversationId,
      message_type:    "vacancy_application",
      job_id:          vacancyId,
      sender_role:     userRow?.user_type ?? null,
      metadata:        { vacancy_title: vacancy.title, ...(cvMeta ?? {}) },
      photo_urls:      [],
      is_read:         false,
      share_personal_info: false,
    })
    if (msgError) {
      console.error("[VACANCY APPLY] Message insert failed:", msgError.message)
      return NextResponse.json({ error: "Could not send your application. Please try again." }, { status: 500 })
    }

    const link = `/messages/${conversationId}`
    await write.from("notifications").insert({
      user_id:    employer.user_id,
      type:       "new_message",
      title:      "New application",
      message:    `Someone applied for "${vacancy.title}"${cvMeta ? " and attached a CV" : ""}. Tap to read it.`,
      link_url:   link,
      action_url: link,
      is_read:    false,
    }).then(() => {}, (e: unknown) => console.error("[VACANCY APPLY] Notification failed:", e))

    return NextResponse.json({ success: true, conversationId })
  } catch (err: any) {
    console.error("[VACANCY APPLY] Unexpected error:", err)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
