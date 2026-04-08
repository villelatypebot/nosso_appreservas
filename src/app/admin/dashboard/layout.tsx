import AdminSidebar from '@/components/admin/AdminSidebar'
import { getBrandSettings } from '@/lib/brand'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)

    return (
        <div style={{ display: 'flex', background: '#040201', minHeight: '100vh', position: 'relative' }}>
            {/* BACKGROUND EFFECTS */}
            <div style={{
                position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100vw', height: '100vw', maxWidth: '1200px', maxHeight: '1200px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,121,32,0.06) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            <AdminSidebar
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
