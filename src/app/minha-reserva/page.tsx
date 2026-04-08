import { Suspense } from 'react'
import ClientReservationManager from '@/components/reservation/ClientReservationManager'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getBrandSettings } from '@/lib/brand'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata() {
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)
    return {
        title: `Gerenciar reserva - ${brand.shortName}`,
        description: 'Gerencie sua reserva usando seu código exclusivo.',
    }
}

export default async function MyReservationPage() {
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)

    return (
        <main style={{ background: '#040201', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

            {/* Background Effects */}
            <div style={{
                position: 'fixed', top: '0', left: '50%', transform: 'translate(-50%, -50%)',
                width: '1000px', height: '1000px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(244,121,32,0.06) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* Header */}
                <header style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 30, padding: '24px',
                }}>
                    <Link href="/" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
                        fontSize: '14px', fontWeight: 500, transition: 'color 0.2s',
                        background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '99px',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <ArrowLeft size={16} /> Voltar
                    </Link>
                </header>

                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh', padding: '120px 24px 60px'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                            Minha Reserva
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
                            Acesse e edite sua reserva em {brand.shortName} com seu código exclusivo.
                        </p>
                    </div>

                    <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.5)' }}>Carregando magia...</div>}>
                        <ClientReservationManager reservationCodePrefix={brand.reservationCodePrefix} />
                    </Suspense>
                </div>

            </div>
        </main>
    )
}
