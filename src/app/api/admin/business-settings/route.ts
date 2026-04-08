import { NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/admin-auth'
import { defaultBrandSettings, getBrandSettings } from '@/lib/brand'

export async function GET() {
    const auth = await requireAdminAccess({ minRole: 'manager' })
    if ('response' in auth) return auth.response

    const settings = await getBrandSettings(auth.adminClient)
    return NextResponse.json({ settings })
}

export async function PATCH(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'admin' })
        if ('response' in auth) return auth.response

        const body = await request.json()
        const brandName = String(body.brandName || '').trim()
        const shortName = String(body.shortName || brandName).trim()
        const reservationCodePrefix = String(body.reservationCodePrefix || '').trim().toUpperCase()
        const primaryColor = String(body.primaryColor || '').trim() || defaultBrandSettings.primaryColor
        const secondaryColor = String(body.secondaryColor || '').trim() || defaultBrandSettings.secondaryColor

        if (!brandName || !shortName || !reservationCodePrefix) {
            return NextResponse.json({ error: 'Marca, nome curto e prefixo do código são obrigatórios.' }, { status: 400 })
        }

        const payload = {
            brand_name: brandName,
            short_name: shortName,
            tagline: String(body.tagline || '').trim() || null,
            description: String(body.description || '').trim() || null,
            support_phone: String(body.supportPhone || '').trim() || null,
            support_email: String(body.supportEmail || '').trim() || null,
            whatsapp_phone: String(body.whatsappPhone || '').trim() || null,
            logo_url: String(body.logoUrl || '').trim() || null,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            reservation_code_prefix: reservationCodePrefix,
        }

        const { data: existing } = await auth.adminClient
            .from('business_settings')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (existing?.id) {
            const { error } = await auth.adminClient
                .from('business_settings')
                .update(payload)
                .eq('id', existing.id)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 })
            }
        } else {
            const { error } = await auth.adminClient
                .from('business_settings')
                .insert(payload)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 })
            }
        }

        const settings = await getBrandSettings(auth.adminClient)
        return NextResponse.json({ settings })
    } catch (error) {
        console.error('PATCH /api/admin/business-settings error:', error)
        return NextResponse.json({ error: 'Erro ao salvar a personalização.' }, { status: 500 })
    }
}
