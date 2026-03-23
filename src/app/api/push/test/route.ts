import { NextResponse } from 'next/server'
import { sendPushToAllAdmins } from '@/lib/push'

export async function POST() {
    try {
        const now = new Date()
        const result = await sendPushToAllAdmins({
            title: 'Teste de notificacao',
            body: `Push enviado em ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
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
