import ReservationWizard from '@/components/reservation/ReservationWizard'
import { MapPin, Phone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
    params: Promise<{ unitSlug: string }>
}

// Static unit data (will be replaced by Supabase fetch once connected)
const UNIT_DATA: Record<string, {
    id: string; name: string; slug: string; address: string; phone: string;
}> = {
    'boa-vista': {
        id: 'unit-boa-vista',
        name: 'Full House Boa Vista',
        slug: 'boa-vista',
        address: 'Av. Gov. Macedo Soares, 795 - Boa Vista, São Gonçalo - RJ, 24436-225',
        phone: '(21) 96556-5686',
    },
    'colubande': {
        id: 'unit-colubande',
        name: 'Full House Colubandê',
        slug: 'colubande',
        address: 'Av. Jorn. Roberto Marinho, 1320 - Colubandê, São Gonçalo - RJ, 24451-715',
        phone: '(21) 96556-5686',
    },
    'araruama': {
        id: 'unit-araruama',
        name: 'Full House Araruama',
        slug: 'araruama',
        address: 'R. Equador, 30 - Parque Hotel, Araruama - RJ, 28981-490',
        phone: '(21) 96556-5686',
    },
    'niteroi': {
        id: 'unit-niteroi',
        name: 'Full House Niterói',
        slug: 'niteroi',
        address: 'R. Noronha Torrezão, 165 - Santa Rosa, Niterói - RJ, 24240-185',
        phone: '(21) 96556-5686',
    },
}

const DEFAULT_ENVIRONMENTS = [
    { id: 'env-principal', name: 'Salão Principal', capacity: 80 },
    { id: 'env-familia', name: 'Espaço Família', capacity: 40 },
]

export async function generateStaticParams() {
    return Object.keys(UNIT_DATA).map((slug) => ({ unitSlug: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { unitSlug } = await params
    const unit = UNIT_DATA[unitSlug]
    return {
        title: unit ? `Reservar — ${unit.name}` : 'Reservar',
        description: `Faça sua reserva no ${unit?.name || 'Full House'}`,
    }
}

async function getUnitData(unitSlug: string) {
    try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()

        const { data: unit, error: unitErr } = await supabase
            .from('units')
            .select('*')
            .eq('slug', unitSlug)
            .eq('is_active', true)
            .single()

        if (unitErr || !unit) {
            console.error('Unit fetch error:', unitErr?.message)
            return null
        }

        // Try both column names (capacity or max_capacity) for compatibility
        let environments: { id: string; name: string; capacity: number }[] = []
        const { data: envs } = await supabase
            .from('environments')
            .select('id, name, capacity, max_capacity')
            .eq('unit_id', unit.id)
            .eq('is_active', true)
            .order('name')

        if (envs && envs.length > 0) {
            environments = envs.map((e: Record<string, unknown>) => ({
                id: e.id as string,
                name: e.name as string,
                capacity: (e.max_capacity ?? e.capacity ?? 50) as number,
            }))
        }

        return { unit, environments: environments.length > 0 ? environments : DEFAULT_ENVIRONMENTS }
    } catch (err) {
        console.error('getUnitData error:', err)
        return null
    }
}

export default async function ReservarPage({ params }: Props) {
    const { unitSlug } = await params
    const result = await getUnitData(unitSlug)

    if (!result) {
        return (
            <main style={{ background: 'var(--brand-dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '12px' }}>Unidade não encontrada</h1>
                    <Link href="/" className="fh-btn fh-btn-primary">Voltar ao início</Link>
                </div>
            </main>
        )
    }

    const { unit, environments } = result

    return (
        <main style={{ background: '#040201', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

            {/* Background Effects */}
            <div style={{
                position: 'fixed', top: '0', left: '50%', transform: 'translate(-50%, -50%)',
                width: '800px', height: '800px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(244,121,32,0.08) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 30,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(4, 2, 1, 0.8)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <Link href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'color 0.2s',
                    }}>
                        <ArrowLeft size={16} />
                        Início
                    </Link>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                    <span style={{
                        fontSize: '14px',
                        color: '#fff',
                        fontWeight: 600,
                        letterSpacing: '-0.01em'
                    }}>
                        {unit.name}
                    </span>
                </header>

                {/* Unit Banner */}
                <div style={{
                    padding: '60px 24px 40px',
                    textAlign: 'center',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <h1 style={{
                        fontSize: 'clamp(32px, 5vw, 48px)',
                        fontWeight: 800,
                        color: '#fff',
                        marginBottom: '16px',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1
                    }}>
                        {unit.name}
                    </h1>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                        {unit.address && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                                <MapPin size={16} color="#F47920" />
                                {unit.address}
                            </span>
                        )}
                        {unit.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                                <Phone size={16} color="#F47920" />
                                {unit.phone}
                            </span>
                        )}
                    </div>
                </div>

                {/* Wizard */}
                <div style={{ padding: '20px 24px 100px' }}>
                    <ReservationWizard
                        unit={unit}
                        environments={environments}
                        availableSlots={{}}
                    />
                </div>
            </div>
        </main>
    )
}
