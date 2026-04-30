import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/server'

/**
 * POST /api/push/native-subscribe
 *
 * Saves an FCM (Android) or APNs (iOS) push token for the authenticated user.
 * Called by the useNativePush() hook after @capacitor/push-notifications
 * successfully registers with the platform notification service.
 *
 * Body: { token: string, deviceType: 'fcm' | 'apns' }
 *
 * Token ownership: a physical device token belongs to exactly one user.
 * If the same token arrives for a different user (e.g. shared device after
 * logout/login), the old user's row is deleted before the new one is saved.
 *
 * device_type values:
 *   'web'  — Web Push subscription JSON (existing, unchanged)
 *   'fcm'  — Firebase Cloud Messaging token (Android)
 *   'apns' — Apple Push Notification Service token (iOS)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token, deviceType } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }
    if (!['fcm', 'apns'].includes(deviceType)) {
      return NextResponse.json({ error: 'deviceType must be fcm or apns' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Resolve role from whichever profile table exists for this user
    const [{ data: company }, { data: homeowner }] = await Promise.all([
      admin.from('company_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      admin.from('homeowner_profiles').select('id').eq('user_id', user.id).maybeSingle(),
    ])
    const role = company ? 'tradesperson' : homeowner ? 'homeowner' : null

    // A device token belongs to exactly one user. Delete any stale row for this
    // token (other user on same device, or this user's own old row) then insert fresh.
    await admin.from('user_push_tokens').delete().eq('token', token)

    const platform = deviceType === 'apns' ? 'ios' : 'android'
    const row: Record<string, unknown> = { user_id: user.id, token, device_type: deviceType, platform }
    if (role !== null) row.role = role
    // last_seen/platform columns added by push_tokens_schema_v2.sql migration
    try { row.last_seen = new Date().toISOString() } catch { /* ignore */ }

    const { error } = await admin.from('user_push_tokens').insert(row)

    if (error) {
      console.error('[NATIVE-PUSH-SUBSCRIBE]', error)
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
    }

    console.log(`[NATIVE-PUSH-SUBSCRIBE] user=${user.id} role=${role} device=${deviceType} token=${token.slice(0, 20)}…`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[NATIVE-PUSH-SUBSCRIBE] Unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/native-subscribe
 *
 * Removes a native push token (e.g. on logout or permission revocation).
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin
      .from('user_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[NATIVE-PUSH-UNSUBSCRIBE] Unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
