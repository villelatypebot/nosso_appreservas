import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    const { webhookId } = await request.json()
    if (!webhookId) return NextResponse.json({ error: 'webhookId obrigatório' }, { status: 400 })

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: webhook } = await supabase.from('webhooks').select('*').eq('id', webhookId).single()
    if (!webhook) return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })

    const payload = JSON.stringify({
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
            message: 'Este é um disparo de teste do Full House Reservas.',
            webhook_name: webhook.name,
            unit_id: webhook.unit_id,
        },
    })

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-FullHouse-Event': 'webhook.test',
        'User-Agent': 'FullHouse-Webhooks/1.0',
    }

    if (webhook.secret) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
        const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
        headers['X-FullHouse-Signature'] = `sha256=${sigHex}`
    }

    let responseStatus: number = 0
    let responseBody: string = ''

    try {
        const res = await fetch(webhook.url, { method: 'POST', headers, body: payload })
        responseStatus = res.status
        responseBody = await res.text()
    } catch (err: unknown) {
        responseBody = err instanceof Error ? err.message : 'Erro de conexão'
    }

    // Log and update
    await Promise.all([
        supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event: 'webhook.test',
            payload: JSON.parse(payload),
            response_status: responseStatus,
            response_body: responseBody.substring(0, 2000),
        }),
        supabase.from('webhooks').update({
            last_status: responseStatus,
            last_triggered_at: new Date().toISOString(),
        }).eq('id', webhookId),
    ])

    return NextResponse.json({ status: responseStatus, body: responseBody.substring(0, 500) })
}
