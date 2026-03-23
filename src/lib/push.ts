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

export interface PushDispatchResult {
    sent: number
    failed: number
    total: number
    skipped?: boolean
    reason?: 'missing_vapid' | 'no_subscriptions' | 'table_missing' | 'fetch_error'
    errors?: string[]
}

/**
 * Send push notification to all subscribed admin users
 */
export async function sendPushToAllAdmins(payload: NotificationPayload): Promise<PushDispatchResult> {
    if (!ensureVapidConfigured()) {
        return {
            sent: 0,
            failed: 0,
            total: 0,
            skipped: true,
            reason: 'missing_vapid',
        }
    }

    const supabase = getAdminClient()

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')

    if (error) {
        // Table might not exist yet — graceful degradation
        if (error.message.includes('does not exist')) {
            console.log('[Push] Table push_subscriptions not found. Run migration 002.')
            return {
                sent: 0,
                failed: 0,
                total: 0,
                skipped: true,
                reason: 'table_missing',
            }
        } else {
            console.log('[Push] Error fetching subscriptions:', error.message)
            return {
                sent: 0,
                failed: 0,
                total: 0,
                skipped: true,
                reason: 'fetch_error',
                errors: [error.message],
            }
        }
    }

    if (!subscriptions || subscriptions.length === 0) {
        console.log('[Push] No subscriptions found')
        return {
            sent: 0,
            failed: 0,
            total: 0,
            skipped: true,
            reason: 'no_subscriptions',
        }
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
    const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => {
            const reason = result.reason
            if (reason && typeof reason === 'object') {
                const statusCode = 'statusCode' in reason ? String((reason as { statusCode?: number }).statusCode) : null
                const message = 'message' in reason ? String((reason as { message?: string }).message) : 'Erro desconhecido no envio do push.'
                return statusCode ? `${statusCode}: ${message}` : message
            }
            return String(reason)
        })

    console.log(`[Push] Sent: ${sent}, Failed: ${failed}`)
    return {
        sent,
        failed,
        total: subscriptions.length,
        errors,
    }
}

/**
 * Format and send notification for reservation events
 */
export async function notifyReservationEvent(
    event: 'created' | 'updated' | 'cancelled',
    data: {
        unitName?: string | null
        customerName: string
        pax: number
        date: string // YYYY-MM-DD
        confirmationCode?: string
    }
) {
    // Format date to DD/MM
    const [, month, day] = data.date.split('-')
    const formattedDate = `${day}/${month}`

    const personLabel = data.pax === 1 ? 'pessoa' : 'pessoas'
    const confirmationSuffix = data.confirmationCode ? ` ${data.confirmationCode}` : ''
    let title: string
    let body: string
    let tag: string

    switch (event) {
        case 'created':
            title = data.unitName
                ? `Nova Reserva na unidade ${data.unitName}! 🎉`
                : 'Nova Reserva! 🎉'
            body = `${data.customerName}, ${data.pax} ${personLabel} ${formattedDate}.${confirmationSuffix}`
            tag = `reservation-new-${data.confirmationCode}`
            break
        case 'updated':
            title = data.unitName
                ? `Reserva editada na unidade ${data.unitName}! ✏️`
                : 'Reserva Editada ✏️'
            body = `${data.customerName}, ${data.pax} ${personLabel} ${formattedDate}.${confirmationSuffix}`
            tag = `reservation-edit-${data.confirmationCode}`
            break
        case 'cancelled':
            title = data.unitName
                ? `Reserva cancelada na unidade ${data.unitName}! ❌`
                : 'Reserva Cancelada ❌'
            body = `${data.customerName}, ${data.pax} ${personLabel} ${formattedDate}.${confirmationSuffix}`
            tag = `reservation-cancel-${data.confirmationCode}`
            break
    }

    return await sendPushToAllAdmins({
        title,
        body,
        url: '/admin/dashboard',
        tag,
    })
}
