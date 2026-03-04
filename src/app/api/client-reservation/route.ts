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
            .select('id, status, unit_id')
            .eq('confirmation_code', code.toUpperCase().trim())
            .single()

        if (errExist || !existing) {
            return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
        }

        // Se estiver cancelada ou finalizada, talvez não deveríamos deixar atualizar
        if (existing.status !== 'pending' && existing.status !== 'confirmed') {
            return NextResponse.json({ error: 'Esta reserva não pode mais ser alterada status: ' + existing.status }, { status: 400 })
        }

        // 2. Aplicamos os updates permitidos na tabela
        const allowedUpdates = {
            pax: Number(updates.pax) || undefined,
            reservation_date: updates.date || undefined,
            reservation_time: updates.time || undefined,
            environment_id: updates.environmentId || undefined,
            updated_at: new Date().toISOString()
        }

        // Limpa chaves undefined
        Object.keys(allowedUpdates).forEach(key => allowedUpdates[key as keyof typeof allowedUpdates] === undefined && delete allowedUpdates[key as keyof typeof allowedUpdates])

        const { data: updatedReservation, error: errUpdate } = await supabase
            .from('reservations')
            .update(allowedUpdates)
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
        console.error('PATCH client reservation error:', err)
        return NextResponse.json({ error: 'Erro interno de processamento.' }, { status: 500 })
    }
}
