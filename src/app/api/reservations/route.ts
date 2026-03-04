import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyReservationEvent } from '@/lib/push'

function getAdminClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { unitId, environmentId, pax, date, time, name, email, phone } = body

        if (!unitId || !pax || !date || !time || !name || !phone) {
            return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
        }

        const supabase = getAdminClient()

        // Upsert customer (by phone)
        const { data: customer, error: custErr } = await supabase
            .from('customers')
            .upsert({ name, email: email || null, phone }, { onConflict: 'phone' })
            .select('id')
            .single()

        if (custErr || !customer) {
            return NextResponse.json({ error: 'Erro ao registrar cliente.' }, { status: 500 })
        }

        // Create reservation
        const { data: reservation, error: resErr } = await supabase
            .from('reservations')
            .insert({
                unit_id: unitId,
                environment_id: environmentId || null,
                customer_id: customer.id,
                reservation_date: date,
                reservation_time: time,
                pax: Number(pax),
                status: 'confirmed',
                source: 'online',
            })
            .select('id, confirmation_code, reservation_date, reservation_time, pax, status')
            .single()

        if (resErr || !reservation) {
            return NextResponse.json({ error: 'Erro ao criar reserva.' }, { status: 500 })
        }

        // Trigger webhooks async (fire and forget)
        triggerWebhooks(supabase, unitId, 'reservation.confirmed', {
            reservation_id: reservation.id,
            confirmation_code: reservation.confirmation_code,
            date: reservation.reservation_date,
            time: reservation.reservation_time,
            pax: reservation.pax,
            customer: { name, email, phone },
            unit_id: unitId,
        }).catch(console.error)

        // Send push notification to admins (fire and forget)
        notifyReservationEvent('created', {
            customerName: name,
            pax: Number(pax),
            date: reservation.reservation_date,
            confirmationCode: reservation.confirmation_code,
        }).catch(console.error)

        return NextResponse.json(reservation, { status: 201 })
    } catch (err) {
        console.error('POST /api/reservations error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Number(searchParams.get('page') || '1')
    const pageSize = 20

    const supabase = getAdminClient()

    let query = supabase
        .from('reservations')
        .select(`
      *,
      units(name, slug),
      environments(name),
      customers(name, email, phone)
    `, { count: 'exact' })
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1)

    if (unitId) query = query.eq('unit_id', unitId)
    if (date) query = query.eq('reservation_date', date)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, total: count, page, pageSize })
}

// ─── PATCH /api/reservations/:id ─────────────────────
export async function PATCH(request: Request) {
    const body = await request.json()
    const { id, status, notes } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

    const supabase = getAdminClient()

    const { data, error } = await supabase
        .from('reservations')
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, customers(name, phone), units(id, name)')
        .single()

    if (error || !data) return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })

    // Trigger webhooks
    const eventMap: Record<string, string> = {
        confirmed: 'reservation.confirmed',
        cancelled: 'reservation.cancelled',
        no_show: 'reservation.no_show',
        seated: 'reservation.seated',
    }
    if (status && eventMap[status]) {
        triggerWebhooks(supabase, data.unit_id, eventMap[status], {
            reservation_id: data.id,
            confirmation_code: data.confirmation_code,
            status: data.status,
            customer: data.customers,
            unit: data.units,
        }).catch(console.error)
    }

    // Send push notification for status changes (fire and forget)
    if (status === 'cancelled') {
        const customer = data.customers as { name: string; phone: string } | null
        notifyReservationEvent('cancelled', {
            customerName: customer?.name || 'Cliente',
            pax: data.pax,
            date: data.reservation_date,
            confirmationCode: data.confirmation_code,
        }).catch(console.error)
    } else if (status === 'confirmed') {
        const customer = data.customers as { name: string; phone: string } | null
        notifyReservationEvent('updated', {
            customerName: customer?.name || 'Cliente',
            pax: data.pax,
            date: data.reservation_date,
            confirmationCode: data.confirmation_code,
        }).catch(console.error)
    }

    return NextResponse.json(data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerWebhooks(
    supabase: ReturnType<typeof createClient<any>>,
    unitId: string,
    event: string,
    payload: Record<string, unknown>
) {
    const { data: webhooks } = await supabase
        .from('webhooks')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .contains('events', [event])

    if (!webhooks || webhooks.length === 0) return

    await Promise.allSettled(
        webhooks.map(async (webhook) => {
            const body = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data: payload,
            })

            let headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-FullHouse-Event': event,
                'User-Agent': 'FullHouse-Webhooks/1.0',
            }

            // HMAC signature
            if (webhook.secret) {
                const encoder = new TextEncoder()
                const key = await crypto.subtle.importKey(
                    'raw', encoder.encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
                )
                const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
                const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
                headers['X-FullHouse-Signature'] = `sha256=${sigHex}`
            }

            let responseStatus: number | null = null
            let responseBody: string | null = null

            try {
                const response = await fetch(webhook.url, { method: 'POST', headers, body })
                responseStatus = response.status
                responseBody = await response.text().catch(() => null)
            } catch (err: unknown) {
                responseStatus = 0
                responseBody = err instanceof Error ? err.message : 'Fetch error'
            }

            // Log it
            await supabase.from('webhook_logs').insert({
                webhook_id: webhook.id,
                reservation_id: (payload.reservation_id as string) || null,
                event,
                payload,
                response_status: responseStatus,
                response_body: responseBody?.substring(0, 2000),
            })

            // Update webhook last status
            await supabase
                .from('webhooks')
                .update({ last_status: responseStatus, last_triggered_at: new Date().toISOString() })
                .eq('id', webhook.id)
        })
    )
}
