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

// POST /api/conversations
// Body: { with_user_id }
//
// Gets or creates a direct conversation between the authenticated user
// and with_user_id. Returns { conversationId }.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { with_user_id } = await request.json() as { with_user_id: string }
    if (!with_user_id) {
      return NextResponse.json({ error: "with_user_id required" }, { status: 400 })
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_conversation",
      { user1_id: user.id, user2_id: with_user_id }
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
