import { NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/admin-auth'
import { ensureUnitDefaults, slugify } from '@/lib/platform'

export async function GET() {
    const auth = await requireAdminAccess({ minRole: 'manager' })
    if ('response' in auth) return auth.response

    const supabase = auth.adminClient

    const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ units: data || [] })
}

export async function POST(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'manager' })
        if ('response' in auth) return auth.response

        const body = await request.json()
        const name = String(body.name || '').trim()
        const slug = slugify(String(body.slug || name || '').trim())
        const address = String(body.address || '').trim()
        const phone = String(body.phone || '').trim()
        const imageUrl = String(body.image_url || '').trim()

        if (!name || !slug) {
            return NextResponse.json({ error: 'Nome e slug são obrigatórios.' }, { status: 400 })
        }

        const supabase = auth.adminClient
        const { data, error } = await supabase
            .from('units')
            .insert({
                name,
                slug,
                address: address || null,
                phone: phone || null,
                image_url: imageUrl || null,
                is_active: true,
            })
            .select('*')
            .single()

        const unit = data as { id: string } | null

        if (error || !unit) {
            return NextResponse.json({ error: error?.message || 'Não foi possível criar o estabelecimento.' }, { status: 400 })
        }

        await ensureUnitDefaults(supabase, unit.id)

        return NextResponse.json({ unit: data }, { status: 201 })
    } catch (error) {
        console.error('POST /api/admin/units error:', error)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await requireAdminAccess({ minRole: 'manager' })
        if ('response' in auth) return auth.response

        const body = await request.json()
        const id = String(body.id || '').trim()

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
        }

        const updateData = {
            name: body.name ? String(body.name).trim() : undefined,
            slug: body.slug ? slugify(String(body.slug).trim()) : undefined,
            address: body.address === undefined ? undefined : (String(body.address || '').trim() || null),
            phone: body.phone === undefined ? undefined : (String(body.phone || '').trim() || null),
            image_url: body.image_url === undefined ? undefined : (String(body.image_url || '').trim() || null),
            is_active: typeof body.is_active === 'boolean' ? body.is_active : undefined,
        }

        const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, value]) => value !== undefined)
        )

        const supabase = auth.adminClient
        const { data, error } = await supabase
            .from('units')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single()

        if (error || !data) {
            return NextResponse.json({ error: error?.message || 'Não foi possível atualizar o estabelecimento.' }, { status: 400 })
        }

        return NextResponse.json({ unit: data })
    } catch (error) {
        console.error('PATCH /api/admin/units error:', error)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}
