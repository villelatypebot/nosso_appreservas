import { NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/admin-auth'
import { generateFollowUpSuggestions } from '@/lib/follow-up-generator'

export async function POST(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'operator' })
        if ('response' in auth) return auth.response

        const body = await request.json()

        const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
        if (!customerName) {
            return NextResponse.json({ error: 'Nome do cliente e obrigatorio.' }, { status: 400 })
        }

        const result = generateFollowUpSuggestions({
            customerName,
            unitName: typeof body.unitName === 'string' ? body.unitName : null,
            reservationDate: typeof body.reservationDate === 'string' ? body.reservationDate : null,
            pax: typeof body.pax === 'number' ? body.pax : Number(body.pax || 0) || null,
            reservationLink: typeof body.reservationLink === 'string' ? body.reservationLink : null,
            goal: body.goal,
            availabilityHint: body.availabilityHint,
            messages: Array.isArray(body.messages) ? body.messages : undefined,
            messageHistoryText: typeof body.messageHistoryText === 'string' ? body.messageHistoryText : null,
        })

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        console.error('POST /api/followups/generate error:', error)
        return NextResponse.json({ error: 'Erro ao gerar follow-up.' }, { status: 500 })
    }
}
