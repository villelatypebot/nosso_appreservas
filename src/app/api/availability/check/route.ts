import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lookupAvailability } from '@/lib/availability-check'

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const supabase = getAdminClient()
        const result = await lookupAvailability(supabase, {
            unitId: typeof body.unitId === 'string' ? body.unitId : null,
            unitSlug: typeof body.unitSlug === 'string' ? body.unitSlug : null,
            unitName: typeof body.unitName === 'string' ? body.unitName : null,
            date: typeof body.date === 'string' ? body.date : null,
            time: typeof body.time === 'string' ? body.time : null,
            pax: typeof body.pax === 'number' ? body.pax : Number(body.pax || 0) || null,
        })

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        console.error('POST /api/availability/check error:', error)
        return NextResponse.json({ error: 'Erro ao verificar disponibilidade.' }, { status: 500 })
    }
}
