import { NextResponse } from 'next/server'
import { sendPushToAllAdmins } from '@/lib/push'

export async function POST() {
    try {
        const now = new Date()
        const result = await sendPushToAllAdmins({
            title: 'Nova Reserva Boa Vista! 🎉',
            body: `Cliente teste, 4 pessoas ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}. FH-TESTE`,
            url: '/admin/dashboard',
            tag: `push-test-${now.getTime()}`,
        })

        return NextResponse.json({
            success: result.sent > 0,
            ...result,
        })
    } catch (err) {
        console.error('POST /api/push/test error:', err)
        return NextResponse.json({ error: 'Erro ao testar push.' }, { status: 500 })
    }
}
