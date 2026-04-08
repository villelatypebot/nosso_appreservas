import AdminLoginClient from '@/components/admin/AdminLoginClient'
import { getBrandSettings } from '@/lib/brand'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLoginPage() {
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)

    return <AdminLoginClient brand={brand} />
}
