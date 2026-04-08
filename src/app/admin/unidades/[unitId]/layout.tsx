import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import type { Metadata } from 'next'
import { getBrandSettings } from '@/lib/brand'

interface Props {
    children: React.ReactNode
    params: Promise<{ unitId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { unitId } = await params
    const supabase = await createClient()
    const { data: unit } = await supabase.from('units').select('name').eq('id', unitId).single()
    const brand = await getBrandSettings(supabase)
    return { title: `${unit?.name || 'Unidade'} — Admin ${brand.shortName}` }
}

export default async function UnitAdminLayout({ children, params }: Props) {
    const { unitId } = await params
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)

    const { data: unit } = await supabase.from('units').select('id, name').eq('id', unitId).single()
    if (!unit) notFound()

    return (
        <div style={{ display: 'flex', background: '#040201', minHeight: '100vh', position: 'relative' }}>
            {/* BACKGROUND EFFECTS */}
            <div style={{
                position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100vw', height: '100vw', maxWidth: '1200px', maxHeight: '1200px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,121,32,0.06) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            {/* Override the outer sidebar with unit-aware sidebar */}
            <AdminSidebar
                unitId={unit.id}
                unitName={unit.name}
                brandName={brand.brandName}
                shortName={brand.shortName}
                logoUrl={brand.logoUrl}
                primaryColor={brand.primaryColor}
                secondaryColor={brand.secondaryColor}
            />
            <main className="admin-content" style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
                {children}
            </main>
        </div>
    )
}
