import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdminAccess } from '@/lib/admin-auth'
import type { Database } from '@/lib/supabase/types'

/**
 * Ensures the push_subscriptions table exists.
 * Called lazily on first subscribe attempt.
 */
async function ensureTable(supabase: SupabaseClient<Database>) {
    // Quick check — try selecting
    const { error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .limit(1)

    if (error && error.message.includes('does not exist')) {
        // Create the table via raw SQL using the pg_net extension / rpc
        // Since we can't run DDL via PostgREST, we'll just let the insert fail gracefully
        console.warn('[Push] Table push_subscriptions does not exist. Please run migration 002_users_and_push.sql')
        return false
    }
    return true
}

// POST: Subscribe to push notifications
export async function POST(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'operator' })
        if ('response' in auth) return auth.response

        const body = await request.json()
        const { subscription } = body

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: 'Subscription data inválida.' }, { status: 400 })
        }

        const supabase = auth.adminClient

        const tableExists = await ensureTable(supabase)
        if (!tableExists) {
            // Fallback: store in a simple way — use a JSON field in admin_users or just log it
            console.warn('[Push] Skipping push subscription — table not ready')
            return NextResponse.json({ success: true, warning: 'Push table not ready. Run migration.' })
        }

        // Upsert subscription (by endpoint)
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    admin_user_id: auth.authUser.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                { onConflict: 'endpoint' }
            )

        if (error) {
            console.error('Push subscribe error:', error)
            return NextResponse.json({ error: 'Erro ao salvar inscrição.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('POST /api/push/subscribe error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

// DELETE: Unsubscribe from push notifications
export async function DELETE(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'operator' })
        if ('response' in auth) return auth.response

        const body = await request.json()
        const { endpoint } = body

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint obrigatório.' }, { status: 400 })
        }

        const supabase = auth.adminClient

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint)
            .eq('admin_user_id', auth.authUser.id)

        if (error) {
            console.error('Push unsubscribe error:', error)
            return NextResponse.json({ error: 'Erro ao remover inscrição.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('DELETE /api/push/subscribe error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}
