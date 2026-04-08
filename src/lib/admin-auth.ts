import { NextResponse } from 'next/server'
import type { AdminUser } from './supabase/types'
import { createClient } from './supabase/server'
import { createAdminClient } from './platform'

const ADMIN_ROLE_ORDER: Record<AdminUser['role'], number> = {
    operator: 1,
    manager: 2,
    admin: 3,
}

interface RequireAdminAccessOptions {
    minRole?: AdminUser['role']
}

export async function requireAdminAccess(options?: RequireAdminAccessOptions) {
    const authClient = await createClient()
    const {
        data: { user },
        error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
        return {
            response: NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 }),
        }
    }

    const adminClient = createAdminClient()
    const { data, error: adminError } = await adminClient
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const adminUser = data as AdminUser | null

    if (adminError || !adminUser) {
        return {
            response: NextResponse.json({ error: 'Acesso administrativo negado.' }, { status: 403 }),
        }
    }

    if (options?.minRole && ADMIN_ROLE_ORDER[adminUser.role] < ADMIN_ROLE_ORDER[options.minRole]) {
        return {
            response: NextResponse.json({ error: 'Você não tem permissão para esta ação.' }, { status: 403 }),
        }
    }

    return {
        adminClient,
        authUser: user,
        adminUser,
    }
}
