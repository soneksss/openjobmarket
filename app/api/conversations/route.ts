import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/conversations?id=<conversationId>
//
// Returns { otherUserId } for a conversation the caller is a participant of.
// Uses admin client so RLS on the conversations table doesn't block it.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: conv } = await admin
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", id)
      .maybeSingle()

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Verify the caller is actually a participant
    if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 })
    }

    const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
    return NextResponse.json({ otherUserId })

  } catch (error) {
    console.error("[CONVERSATIONS GET] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/conversations?id=<conversationId>[&id=<id2>...]
//
// Deletes one or more conversations (+ all their messages) that the
// authenticated user is a participant of. Uses admin client to bypass
// RLS — without this, messages sent by the other party cannot be deleted
// from the browser and reappear on the next refetch.
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ids = request.nextUrl.searchParams.getAll("id")
    if (ids.length === 0) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // --- Step 1: verify via conversations table ---
    const { data: convRows } = await admin
      .from("conversations")
      .select("id, participant_1, participant_2")
      .in("id", ids)

    const allowedViaConvs = (convRows ?? [])
      .filter(c => c.participant_1 === user.id || c.participant_2 === user.id)
      .map(c => c.id)

    // --- Step 2: for IDs not in conversations table, verify via messages ---
    const foundInConvs = new Set((convRows ?? []).map(c => c.id))
    const orphanIds    = ids.filter(id => !foundInConvs.has(id))

    let allowedViaMessages: string[] = []
    if (orphanIds.length > 0) {
      // User must appear as sender or recipient in at least one message of each conversation
      const { data: msgRows } = await admin
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", orphanIds)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

      allowedViaMessages = [...new Set((msgRows ?? []).map(m => m.conversation_id).filter(Boolean))]
    }

    const allowed = [...new Set([...allowedViaConvs, ...allowedViaMessages])]

    if (allowed.length === 0) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 })
    }

    await Promise.all([
      admin.from("messages").delete().in("conversation_id", allowed),
      admin.from("conversations").delete().in("id", allowed),
    ])

    return NextResponse.json({ deleted: allowed })

  } catch (error) {
    console.error("[CONVERSATIONS DELETE] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/conversations
// Body: { with_user_id, job_id? }
//
// Gets or creates a direct conversation between the authenticated user
// and with_user_id. Returns { conversationId }.
// Uses admin client for the RPC to bypass GRANT/RLS issues for all user types.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json() as { with_user_id: string; job_id?: string }
    const { with_user_id, job_id } = body
    if (!with_user_id) {
      return NextResponse.json({ error: "with_user_id required" }, { status: 400 })
    }
    if (with_user_id === user.id) {
      return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 })
    }

    // Use admin client so homeowners/professionals can create conversations
    // without needing explicit GRANT EXECUTE on get_or_create_conversation.
    // Always pass all 4 parameters (nulls for unused ones) to avoid PostgreSQL
    // "ambiguous function overload" error between the 2-param and 4-param versions.
    const admin = createAdminClient()

    const { data: conversationId, error: rpcError } = await admin.rpc(
      "get_or_create_conversation",
      {
        user1_id:  user.id,
        user2_id:  with_user_id,
        p_job_id:  job_id ?? null,
        p_subject: null,
      }
    )

    if (rpcError) {
      console.error("[CONVERSATIONS POST] RPC error:", rpcError.message)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ conversationId: conversationId ?? null })

  } catch (error) {
    console.error("[CONVERSATIONS POST] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
