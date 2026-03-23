import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findWeeklyReservationByPhone, ReservationValidationError } from '@/lib/reservation-validation'

function getAdminClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')
        const date = searchParams.get('date')

        if (!phone || !date) {
            return NextResponse.json({ error: 'Telefone e data sao obrigatorios.' }, { status: 400 })
        }

        const supabase = getAdminClient()
        const reservation = await findWeeklyReservationByPhone(supabase, { phone, date })

        return NextResponse.json({
            hasReservation: Boolean(reservation),
        })
    } catch (err) {
        if (err instanceof ReservationValidationError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }

        console.error('GET /api/reservations/weekly-check error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}
