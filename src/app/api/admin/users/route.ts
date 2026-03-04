import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// GET: List all admin users
export async function GET() {
    const supabase = getAdminClient()

    const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data || [] })
}

// POST: Create a new admin user (creates auth user + admin_users record)
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, password, role } = body

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
        }

        if (!['admin', 'viewer'].includes(role)) {
            return NextResponse.json({ error: 'Role inválida. Use: admin ou viewer.' }, { status: 400 })
        }

        const supabase = getAdminClient()

        // 1. Create auth user in Supabase
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError || !authUser.user) {
            console.error('Create auth user error:', authError)
            const msg = authError?.message?.includes('already been registered')
                ? 'Este e-mail já está cadastrado.'
                : 'Erro ao criar usuário de autenticação.'
            return NextResponse.json({ error: msg }, { status: 400 })
        }

        // 2. Create admin_users record
        const { data: adminUser, error: dbError } = await supabase
            .from('admin_users')
            .insert({
                id: authUser.user.id,
                name,
                role,
                unit_ids: null,
            })
            .select()
            .single()

        if (dbError) {
            // Rollback: delete auth user
            await supabase.auth.admin.deleteUser(authUser.user.id)
            console.error('Create admin_user error:', dbError)
            return NextResponse.json({ error: 'Erro ao registrar usuário admin.' }, { status: 500 })
        }

        return NextResponse.json({ user: adminUser }, { status: 201 })
    } catch (err) {
        console.error('POST /api/admin/users error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

// PATCH: Update admin user (name, role)
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { id, name, role } = body

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
        }

        if (role && !['admin', 'viewer'].includes(role)) {
            return NextResponse.json({ error: 'Role inválida. Use: admin ou viewer.' }, { status: 400 })
        }

        const supabase = getAdminClient()

        const updateData: Record<string, unknown> = {}
        if (name) updateData.name = name
        if (role) updateData.role = role

        const { data, error } = await supabase
            .from('admin_users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 })
        }

        return NextResponse.json({ user: data })
    } catch (err) {
        console.error('PATCH /api/admin/users error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}

// DELETE: Remove admin user (deletes both admin_users record and auth user)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
        }

        const supabase = getAdminClient()

        // Delete admin_users record first (CASCADE will handle push_subscriptions)
        const { error: dbError } = await supabase
            .from('admin_users')
            .delete()
            .eq('id', id)

        if (dbError) {
            return NextResponse.json({ error: 'Erro ao deletar registro do admin.' }, { status: 500 })
        }

        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(id)
        if (authError) {
            console.error('Delete auth user error:', authError)
            // Don't fail - the admin record is already deleted
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('DELETE /api/admin/users error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}
