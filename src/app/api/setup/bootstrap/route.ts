import { NextResponse } from 'next/server'
import { runtimeFlags } from '@/lib/brand'
import { countAdminUsers, createAdminClient, ensureUnitDefaults, slugify } from '@/lib/platform'

export async function POST(request: Request) {
    try {
        if (!runtimeFlags.setupEnabled) {
            return NextResponse.json({ error: 'O setup inicial está desativado.' }, { status: 403 })
        }

        const supabase = createAdminClient()
        const adminCount = await countAdminUsers(supabase)

        if (adminCount > 0) {
            return NextResponse.json({ error: 'O setup inicial já foi concluído.' }, { status: 409 })
        }

        const body = await request.json()
        const brandName = String(body.brandName || '').trim()
        const shortName = String(body.shortName || brandName).trim()
        const tagline = String(body.tagline || '').trim()
        const description = String(body.description || '').trim()
        const supportPhone = String(body.supportPhone || '').trim()
        const supportEmail = String(body.supportEmail || '').trim()
        const whatsappPhone = String(body.whatsappPhone || '').trim()
        const logoUrl = String(body.logoUrl || '').trim()
        const primaryColor = String(body.primaryColor || '#ff8a3d').trim() || '#ff8a3d'
        const secondaryColor = String(body.secondaryColor || '#d96b0d').trim() || '#d96b0d'
        const reservationCodePrefix = String(body.reservationCodePrefix || 'RS').trim().toUpperCase()

        const adminName = String(body.adminName || '').trim()
        const adminEmail = String(body.adminEmail || '').trim().toLowerCase()
        const adminPassword = String(body.adminPassword || '').trim()

        const establishmentName = String(body.establishmentName || '').trim()
        const establishmentSlug = slugify(String(body.establishmentSlug || establishmentName || '').trim())
        const establishmentAddress = String(body.establishmentAddress || '').trim()
        const establishmentPhone = String(body.establishmentPhone || '').trim()

        if (!brandName || !adminName || !adminEmail || !adminPassword || !establishmentName || !establishmentSlug) {
            return NextResponse.json({ error: 'Preencha marca, administrador e primeiro estabelecimento.' }, { status: 400 })
        }

        if (adminPassword.length < 6) {
            return NextResponse.json({ error: 'A senha do administrador deve ter pelo menos 6 caracteres.' }, { status: 400 })
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
        })

        if (authError || !authUser.user) {
            return NextResponse.json({ error: authError?.message || 'Não foi possível criar o administrador inicial.' }, { status: 400 })
        }

        const { error: adminInsertError } = await supabase
            .from('admin_users')
            .insert({
                id: authUser.user.id,
                name: adminName,
                role: 'admin',
                unit_ids: null,
            })

        if (adminInsertError) {
            await supabase.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ error: adminInsertError.message || 'Não foi possível registrar o administrador.' }, { status: 500 })
        }

        const { data: existingSettings } = await supabase
            .from('business_settings')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (existingSettings?.id) {
            await supabase
                .from('business_settings')
                .update({
                    brand_name: brandName,
                    short_name: shortName || brandName,
                    tagline: tagline || null,
                    description: description || null,
                    support_phone: supportPhone || null,
                    support_email: supportEmail || null,
                    whatsapp_phone: whatsappPhone || null,
                    logo_url: logoUrl || null,
                    primary_color: primaryColor,
                    secondary_color: secondaryColor,
                    reservation_code_prefix: reservationCodePrefix || 'RS',
                })
                .eq('id', existingSettings.id)
        } else {
            await supabase.from('business_settings').insert({
                brand_name: brandName,
                short_name: shortName || brandName,
                tagline: tagline || null,
                description: description || null,
                support_phone: supportPhone || null,
                support_email: supportEmail || null,
                whatsapp_phone: whatsappPhone || null,
                logo_url: logoUrl || null,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                reservation_code_prefix: reservationCodePrefix || 'RS',
            })
        }

        const { data: unit, error: unitError } = await supabase
            .from('units')
            .insert({
                name: establishmentName,
                slug: establishmentSlug,
                address: establishmentAddress || null,
                phone: establishmentPhone || null,
                is_active: true,
                image_url: logoUrl || null,
            })
            .select('id, slug')
            .single()

        if (unitError || !unit) {
            return NextResponse.json({ error: unitError?.message || 'Não foi possível criar o primeiro estabelecimento.' }, { status: 400 })
        }

        await ensureUnitDefaults(supabase, unit.id)

        return NextResponse.json({
            success: true,
            establishment: unit,
            nextUrl: '/admin/login',
        })
    } catch (error) {
        console.error('POST /api/setup/bootstrap error:', error)
        return NextResponse.json({ error: 'Erro ao concluir o setup inicial.' }, { status: 500 })
    }
}
