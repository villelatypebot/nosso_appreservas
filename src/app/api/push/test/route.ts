import { NextResponse } from 'next/server'
import { sendPushToAllAdmins } from '@/lib/push'
import { getBrandSettings, stripBrandPrefix } from '@/lib/brand'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function POST() {
    try {
        const auth = await requireAdminAccess({ minRole: 'operator' })
        if ('response' in auth) return auth.response

        const now = new Date()
        const supabase = auth.adminClient
        const brand = await getBrandSettings(supabase)
        const { data: firstUnit } = await supabase
            .from('units')
            .select('name')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        const unitLabel = stripBrandPrefix(firstUnit?.name, brand.brandName) || brand.shortName
        const result = await sendPushToAllAdmins({
            title: `Teste de notificação ${unitLabel}`,
            body: `Cliente teste, 4 pessoas ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}. ${brand.reservationCodePrefix}-TESTE`,
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
