import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

let vapidConfigured = false

function ensureVapidConfigured() {
    if (vapidConfigured) return true

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:fullhouse@rocketmediabrasil.com'

    if (!publicKey || !privateKey) {
        console.warn('[Push] VAPID keys are missing. Push notifications are disabled.')
        return false
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
    return true
}

function getAdminClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

interface NotificationPayload {
    title: string
    body: string
    url?: string
    tag?: string
}

/**
 * Send push notification to all subscribed admin users
 */
export async function sendPushToAllAdmins(payload: NotificationPayload) {
    if (!ensureVapidConfigured()) return

    const supabase = getAdminClient()

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')

    if (error) {
        // Table might not exist yet — graceful degradation
        if (error.message.includes('does not exist')) {
            console.log('[Push] Table push_subscriptions not found. Run migration 002.')
        } else {
            console.log('[Push] Error fetching subscriptions:', error.message)
        }
        return
    }

    if (!subscriptions || subscriptions.length === 0) {
        console.log('[Push] No subscriptions found')
        return
    }

    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    JSON.stringify(payload)
                )
            } catch (err: unknown) {
                // If subscription is expired/invalid, remove it
                if (err && typeof err === 'object' && 'statusCode' in err) {
                    const statusCode = (err as { statusCode: number }).statusCode
                    if (statusCode === 404 || statusCode === 410) {
                        console.log(`[Push] Removing expired subscription: ${sub.id}`)
                        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                    }
                }
                throw err
            }
        })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    console.log(`[Push] Sent: ${sent}, Failed: ${failed}`)
}

/**
 * Format and send notification for reservation events
 */
export async function notifyReservationEvent(
    event: 'created' | 'updated' | 'cancelled',
    data: {
        customerName: string
        pax: number
        date: string // YYYY-MM-DD
        confirmationCode?: string
    }
) {
    // Format date to DD/MM
    const [, month, day] = data.date.split('-')
    const formattedDate = `${day}/${month}`

    let title: string
    let body: string
    let tag: string

    switch (event) {
        case 'created':
            title = 'Nova Reserva! 🎉'
            body = `${data.customerName}. ${data.pax} pessoas (${formattedDate}).`
            tag = `reservation-new-${data.confirmationCode}`
            break
        case 'updated':
            title = 'Reserva Editada ✏️'
            body = `${data.customerName}. ${data.pax} pessoas (${formattedDate}).`
            tag = `reservation-edit-${data.confirmationCode}`
            break
        case 'cancelled':
            title = 'Reserva Cancelada ❌'
            body = `${data.customerName}. ${data.pax} pessoas (${formattedDate}).`
            tag = `reservation-cancel-${data.confirmationCode}`
            break
    }

    await sendPushToAllAdmins({
        title,
        body,
        url: '/admin/dashboard',
        tag,
    })
}
