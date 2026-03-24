import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assistConversation } from '@/lib/conversation-assistant'

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

        const result = await assistConversation(supabase, {
            customerName: typeof body.customerName === 'string' ? body.customerName : null,
            unitId: typeof body.unitId === 'string' ? body.unitId : null,
            unitSlug: typeof body.unitSlug === 'string' ? body.unitSlug : null,
            unitName: typeof body.unitName === 'string' ? body.unitName : null,
            reservationDate: typeof body.reservationDate === 'string' ? body.reservationDate : null,
            reservationTime: typeof body.reservationTime === 'string' ? body.reservationTime : null,
            pax: typeof body.pax === 'number' ? body.pax : Number(body.pax || 0) || null,
            reservationLink: typeof body.reservationLink === 'string' ? body.reservationLink : null,
            messages: Array.isArray(body.messages) ? body.messages : undefined,
            messageHistoryText: typeof body.messageHistoryText === 'string' ? body.messageHistoryText : null,
        })

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        console.error('POST /api/conversation/assist error:', error)
        return NextResponse.json({ error: 'Erro ao processar a conversa.' }, { status: 500 })
    }
}
