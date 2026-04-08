import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/types'

export function createAdminClient(): SupabaseClient<Database> {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export function slugify(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

export async function countAdminUsers(supabase = createAdminClient()) {
    const { count, error } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })

    if (error) {
        throw new Error(error.message)
    }

    return count || 0
}

export async function ensureUnitDefaults(
    supabase: ReturnType<typeof createAdminClient>,
    unitId: string
) {
    const { count: rulesCount } = await supabase
        .from('reservation_rules')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId)

    if (!rulesCount) {
        await supabase.from('reservation_rules').insert({
            unit_id: unitId,
            min_advance_hours: 2,
            max_advance_days: 60,
            tolerance_minutes: 30,
            min_pax: 1,
            max_pax: 20,
            cancellation_policy: 'A reserva pode ser cancelada com até 4 horas de antecedência.',
            custom_fields: [],
        })
    }

    const { count: environmentCount } = await supabase
        .from('environments')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId)

    if (!environmentCount) {
        await supabase.from('environments').insert({
            unit_id: unitId,
            name: 'Principal',
            max_capacity: 50,
            is_active: true,
        })
    }
}
