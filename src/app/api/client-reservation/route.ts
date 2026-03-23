import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyReservationEvent } from '@/lib/push'
import {
    normalizeReservationTime,
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
    return error.code === 'PGRST202' || error.message?.includes('update_reservation_safely') || false
}

// GET: Recupera os dados da reserva usando APENAS o código de confirmação.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.json({ error: 'Código de reserva ausente.' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`
            id, reservation_date, reservation_time, pax, status, confirmation_code, unit_id,
            environments(id, name),
            units(id, name, address),
            customers(name, phone, email)
        `)
        .eq('confirmation_code', code.toUpperCase().trim())
        .single()

    if (error || !reservation) {
        console.error('Fetch client reservation error:', error?.message || 'Not found')
        return NextResponse.json({ error: 'Reserva não encontrada ou código inválido.' }, { status: 404 })
    }

    return NextResponse.json({ reservation }, { status: 200 })
}

// PATCH: Atualiza certos campos permitidos (data, horário, pessoas). Requer validação pelo confirmation_code também.
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { code, updates } = body // updates contendo { pax, date, time } etc.

        if (!code || !updates) {
            return NextResponse.json({ error: 'Código e dados de atualização são obrigatórios' }, { status: 400 })
        }

        const supabase = getAdminClient()

        // 1. Verificamos se a reserva bate com o código
        const { data: existing, error: errExist } = await supabase
            .from('reservations')
            .select('id, status, unit_id, reservation_date, reservation_time, pax, environment_id')
            .eq('confirmation_code', code.toUpperCase().trim())
            .single()

        if (errExist || !existing) {
            return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
        }

        // Se estiver cancelada ou finalizada, talvez não deveríamos deixar atualizar
        if (existing.status !== 'pending' && existing.status !== 'confirmed') {
            return NextResponse.json({ error: 'Esta reserva não pode mais ser alterada status: ' + existing.status }, { status: 400 })
        }

        const nextPax = Number(updates.pax ?? existing.pax)
        const nextDate = updates.date || existing.reservation_date
        const nextTime = normalizeReservationTime(updates.time || existing.reservation_time)
        const nextEnvironmentId = updates.environmentId ?? existing.environment_id ?? null

        await validateReservationRequest(supabase, {
            unitId: existing.unit_id,
            environmentId: nextEnvironmentId,
            pax: nextPax,
            date: nextDate,
            time: nextTime,
            excludeReservationId: existing.id,
        })

        const { data: rpcUpdated, error: rpcError } = await supabase
            .rpc('update_reservation_safely', {
                p_confirmation_code: code.toUpperCase().trim(),
                p_pax: nextPax,
                p_reservation_date: nextDate,
                p_reservation_time: nextTime,
                p_environment_id: nextEnvironmentId,
            })
            .single()

        if (rpcError && !shouldFallbackToAppValidation(rpcError)) {
            console.error('update_reservation_safely rpc error:', rpcError)
            return NextResponse.json({ error: rpcError.message || 'Falha ao atualizar reserva' }, { status: 400 })
        }

        const { data: updatedReservation, error: errUpdate } = rpcUpdated
            ? await supabase
                .from('reservations')
                .select(`
                    id, reservation_date, reservation_time, pax, status, confirmation_code,
                    environments(id, name),
                    units(id, name, address),
                    customers(name, phone, email)
                `)
                .eq('id', rpcUpdated.id)
                .single()
            : await supabase
                .from('reservations')
                .update({
                    pax: nextPax,
                    reservation_date: nextDate,
                    reservation_time: nextTime,
                    environment_id: nextEnvironmentId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select(`
                    id, reservation_date, reservation_time, pax, status, confirmation_code,
                    environments(id, name),
                    units(id, name, address),
                    customers(name, phone, email)
                `)
                .single()

        if (errUpdate || !updatedReservation) {
            return NextResponse.json({ error: 'Falha ao atualizar reserva' }, { status: 500 })
        }

        // Send push notification to admins about the edit (fire and forget)
        const rawCustomer = updatedReservation.customers
        const customer = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer) as { name: string } | null
        notifyReservationEvent('updated', {
            customerName: customer?.name || 'Cliente',
            pax: updatedReservation.pax,
            date: updatedReservation.reservation_date,
            confirmationCode: updatedReservation.confirmation_code,
        }).catch(console.error)

        return NextResponse.json({ reservation: updatedReservation }, { status: 200 })

    } catch (err) {
        if (err instanceof ReservationValidationError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('PATCH client reservation error:', err)
        return NextResponse.json({ error: 'Erro interno de processamento.' }, { status: 500 })
    }
}
