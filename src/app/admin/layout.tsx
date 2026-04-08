import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin — Sistema de Reservas',
    description: 'Painel administrativo do sistema de reservas',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
