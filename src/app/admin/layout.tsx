import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin — Full House',
    description: 'Painel administrativo Full House',
}

// This layout only wraps /admin/login and /admin/dashboard (no sidebar here,
// sidebar is injected per the unit layout). The unit-level layout handles sidebar injection.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Allow login page through without auth
    // (middleware already handles redirect, this is a safety net)
    // We don't check path here — middleware handles it.

    return <>{children}</>
}
