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
 * The user_push_tokens table already has:
 *   id, user_id, token, device_type, created_at, UNIQUE(user_id, token)
 *
 * device_type values:
 *   'web'  — Web Push subscription JSON (existing, unchanged)
 *   'fcm'  — Firebase Cloud Messaging token (Android)
 *   'apns' — Apple Push Notification Service token (iOS)
 *
 * Existing web push tokens are untouched — both systems coexist.
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
    const { error } = await admin.from('user_push_tokens').upsert(
      { user_id: user.id, token, device_type: deviceType },
      { onConflict: 'user_id,token' }
    )

    if (error) {
      console.error('[NATIVE-PUSH-SUBSCRIBE]', error)
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
    }

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
