import Link from 'next/link'
import { ArrowRight, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getBrandSettings, stripBrandPrefix } from '@/lib/brand'
import BrandMark from '@/components/branding/BrandMark'

export default async function HomePage() {
    const supabase = await createClient()
    const brand = await getBrandSettings(supabase)
    const { data: units } = await supabase
        .from('units')
        .select('id, name, slug, address, phone, image_url')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

    return (
        <main style={{
            background: '#040201',
            minHeight: '100vh',
            color: '#fff',
            overflow: 'hidden',
            position: 'relative',
        }}>
            <div style={{
                position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100vw', height: '100vw', maxWidth: '1200px', maxHeight: '1200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(244,121,32,0.06) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '96px 24px 60px' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
                    <Link href="/minha-reserva" style={{ textDecoration: 'none' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '99px',
                            background: 'rgba(244,121,32,0.15)',
                            border: '1px solid rgba(244,121,32,0.3)',
                            color: '#F47920', fontSize: '14px', fontWeight: 600,
                        }}>
                            Já tenho reserva
                            <ArrowRight size={16} />
                        </div>
                    </Link>

                    {(!units || units.length === 0) && (
                        <Link href="/setup" style={{ textDecoration: 'none' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', borderRadius: '99px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#fff', fontSize: '14px', fontWeight: 600,
                            }}>
                                Setup inicial
                            </div>
                        </Link>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                        <BrandMark
                            size={78}
                            brandName={brand.brandName}
                            shortName={brand.shortName}
                            logoUrl={brand.logoUrl}
                            primaryColor={brand.primaryColor}
                            secondaryColor={brand.secondaryColor}
                            rounded={22}
                        />
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(40px, 7vw, 76px)',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.05,
                        marginBottom: '20px',
                    }}>
                        {brand.shortName}
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 'clamp(16px, 2.5vw, 22px)',
                        maxWidth: '760px',
                        margin: '0 auto 14px',
                        fontWeight: 500,
                        lineHeight: 1.5,
                    }}>
                        {brand.tagline}
                    </p>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '15px',
                        maxWidth: '760px',
                        margin: '0 auto',
                        lineHeight: 1.7,
                    }}>
                        {brand.description}
                    </p>
                </div>

                {!units || units.length === 0 ? (
                    <div className="fh-card" style={{ maxWidth: '760px', margin: '0 auto', padding: '36px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Nenhum estabelecimento configurado ainda</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '18px' }}>
                            Conclua o setup inicial e cadastre a primeira unidade para liberar as reservas públicas.
                        </p>
                        <Link href="/setup" className="fh-btn fh-btn-primary">Abrir setup</Link>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px',
                        paddingBottom: '80px',
                    }}>
                        {units.map((unit, index) => (
                            <Link key={unit.id} href={`/reservar/${unit.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '32px',
                                    padding: '32px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                                        <BrandMark
                                            size={56}
                                            brandName={brand.brandName}
                                            shortName={brand.shortName}
                                            logoUrl={unit.image_url || brand.logoUrl}
                                            primaryColor={brand.primaryColor}
                                            secondaryColor={brand.secondaryColor}
                                            rounded={18}
                                        />
                                        <div>
                                            <p style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: 'rgba(255,255,255,0.4)',
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                marginBottom: '2px',
                                            }}>
                                                {brand.shortName}
                                            </p>
                                            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                                                {stripBrandPrefix(unit.name, brand.brandName) || unit.name || `Unidade ${index + 1}`}
                                            </h2>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px', flex: 1 }}>
                                        {unit.address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: 500 }}>
                                                <MapPin size={18} color={brand.primaryColor} />
                                                <span>{unit.address}</span>
                                            </div>
                                        )}
                                        {unit.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: 500 }}>
                                                <Phone size={18} color={brand.primaryColor} />
                                                <span>{unit.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '16px 20px', borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                                            Reservar agora
                                        </span>
                                        <ArrowRight size={16} color="#fff" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}
