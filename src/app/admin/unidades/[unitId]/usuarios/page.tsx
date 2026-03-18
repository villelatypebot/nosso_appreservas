'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UnitUsersPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to the global user management page
        router.replace('/admin/dashboard/usuarios')
    }, [router])

    return (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Redirecionando para gerenciamento de usuários...
        </div>
    )
}
