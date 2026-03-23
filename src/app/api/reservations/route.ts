import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyReservationEvent } from '@/lib/push'
import {
    buildReservationCustomData,
    ReservationValidationError,
    validateReservationRequest,
} from '@/lib/reservation-validation'

function getAdminClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

function shouldFallbackToAppValidation(error: { code?: string; message?: string } | null) {
    if (!error) return false
    return error.code === 'PGRST202' || error.message?.includes('create_reservation_safely') || false
}

async function createReservationFallback(
    supabase: ReturnType<typeof getAdminClient>,
    params: {
        unitId: string
        environmentId?: string | null
        pax: number
        date: string
        time: string
        name: string
        email?: string | null
        phone: string
        notes?: string | null
        occasion?: string | null
    }
) {
    const { data: customer, error: custErr } = await supabase
        .from('customers')
        .upsert(
            { name: params.name, email: params.email || null, phone: params.phone },
            { onConflict: 'phone' }
        )
        .select('id')
        .single()

    if (custErr || !customer) {
        console.error('Customer upsert error:', custErr)
        throw new ReservationValidationError('Erro ao registrar cliente.', 500)
    }

    const { data: reservation, error: resErr } = await supabase
        .from('reservations')
        .insert({
            unit_id: params.unitId,
            environment_id: params.environmentId || null,
            customer_id: customer.id,
            reservation_date: params.date,
            reservation_time: params.time,
            pax: params.pax,
            status: 'confirmed',
            notes: params.notes || null,
            source: 'online',
            custom_data: buildReservationCustomData(params.occasion),
        })
        .select('id, confirmation_code, reservation_date, reservation_time, pax, status')
        .single()

    if (resErr || !reservation) {
        console.error('Reservation insert error:', resErr)
        throw new ReservationValidationError('Erro ao criar reserva.', 500)
    }

    return reservation
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { unitId, environmentId, pax, date, time, name, email, phone, notes, occasion } = body

        if (!unitId || !pax || !date || !time || !name || !phone) {
            return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
        }

        const supabase = getAdminClient()
        const numericPax = Number(pax)
        const { normalizedTime } = await validateReservationRequest(supabase, {
            unitId,
            environmentId: environmentId || null,
            pax: numericPax,
            date,
            time,
        })

        const { data: rpcReservation, error: rpcError } = await supabase
            .rpc('create_reservation_safely', {
                p_unit_id: unitId,
                p_environment_id: environmentId || null,
                p_pax: numericPax,
                p_reservation_date: date,
                p_reservation_time: normalizedTime,
                p_name: name,
                p_email: email || null,
                p_phone: phone,
                p_notes: notes || null,
                p_occasion: occasion || null,
            })
            .single()

        let reservation = rpcReservation

        if (rpcError) {
            if (shouldFallbackToAppValidation(rpcError)) {
                console.warn('[Reservations] RPC create_reservation_safely not found. Falling back to app-side validation.')
                reservation = await createReservationFallback(supabase, {
                    unitId,
                    environmentId: environmentId || null,
                    pax: numericPax,
                    date,
                    time: normalizedTime,
                    name,
                    email: email || null,
                    phone,
                    notes: notes || null,
                    occasion: occasion || null,
                })
            } else {
                console.error('create_reservation_safely rpc error:', rpcError)
                return NextResponse.json({ error: rpcError.message || 'Erro ao criar reserva.' }, { status: 400 })
            }
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
        if (err instanceof ReservationValidationError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('POST /api/reservations error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
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

async function triggerWebhooks(
    supabase: ReturnType<typeof getAdminClient>,
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

            const headers: Record<string, string> = {
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
