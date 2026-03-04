import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, TrendingUp, Calendar, Users, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getMetrics(supabase: Awaited<ReturnType<typeof createClient>>) {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [unitsRes, todayRes, weekRes, noShowRes, pendingRes] = await Promise.all([
        supabase.from('units').select('id, name, slug').eq('is_active', true),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('reservation_date', today),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('reservation_date', weekAgo),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'no_show').gte('reservation_date', weekAgo),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    return {
        units: unitsRes.data || [],
        todayCount: todayRes.count || 0,
        weekCount: weekRes.count || 0,
        noShowCount: noShowRes.count || 0,
        pendingCount: pendingRes.count || 0,
        noShowRate: weekRes.count ? Math.round(((noShowRes.count || 0) / weekRes.count) * 100) : 0,
    }
}

async function getRecentReservations(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data } = await supabase
        .from('reservations')
        .select('id, confirmation_code, reservation_date, reservation_time, pax, status, customers(name, phone), units(name)')
        .order('created_at', { ascending: false })
        .limit(8)
    return data || []
}

export default async function AdminDashboard() {
    const supabase = await createClient()
    const [metrics, recent] = await Promise.all([
        getMetrics(supabase),
        getRecentReservations(supabase),
    ])

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            pending: { label: 'Pendente', cls: 'badge-pending' },
            confirmed: { label: 'Confirmada', cls: 'badge-confirmed' },
            seated: { label: 'Sentado', cls: 'badge-seated' },
            no_show: { label: 'No-show', cls: 'badge-no_show' },
            cancelled: { label: 'Cancelada', cls: 'badge-cancelled' },
        }
        return map[status] || { label: status, cls: '' }
    }

    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
        <div style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '14px', color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px' }}>{today}</p>
                <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>Dashboard Global</h1>
            </div>

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {[
                    {
                        icon: <Calendar size={20} color="#C9A84C" />,
                        iconBg: 'rgba(201,168,76,0.12)',
                        value: metrics.todayCount,
                        label: 'Reservas hoje',
                        delta: null,
                    },
                    {
                        icon: <TrendingUp size={20} color="var(--color-success)" />,
                        iconBg: 'var(--color-success-bg)',
                        value: metrics.weekCount,
                        label: 'Esta semana',
                        delta: null,
                    },
                    {
                        icon: <AlertTriangle size={20} color="var(--color-warning)" />,
                        iconBg: 'var(--color-warning-bg)',
                        value: metrics.pendingCount,
                        label: 'Pendentes',
                        delta: null,
                    },
                    {
                        icon: <Users size={20} color="var(--color-danger)" />,
                        iconBg: 'var(--color-danger-bg)',
                        value: `${metrics.noShowRate}%`,
                        label: 'Taxa no-show (7d)',
                        delta: null,
                    },
                ].map((card, i) => (
                    <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="stat-icon" style={{ background: card.iconBg }}>
                            {card.icon}
                        </div>
                        <div className="stat-value">{card.value}</div>
                        <div className="stat-label">{card.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Recent reservations */}
                <div className="fh-card" style={{ padding: '0' }}>
                    <div style={{
                        padding: '18px 20px',
                        borderBottom: '1px solid var(--brand-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Reservas recentes</h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="fh-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cliente</th>
                                    <th>Unidade</th>
                                    <th>Data</th>
                                    <th>Pessoas</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                                            Nenhuma reserva ainda
                                        </td>
                                    </tr>
                                )}
                                {recent.map((r: Record<string, unknown>) => {
                                    const customer = r.customers as { name: string; phone: string } | null
                                    const unit = r.units as { name: string } | null
                                    const sb = statusBadge(r.status as string)
                                    return (
                                        <tr key={r.id as string}>
                                            <td style={{ fontSize: '12px', color: 'var(--brand-gold)' }}>
                                                {r.confirmation_code as string}
                                            </td>
                                            <td>{customer?.name || '—'}</td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{unit?.name || '—'}</td>
                                            <td style={{ fontSize: '12px' }}>
                                                {formatDate(r.reservation_date as string)} {String(r.reservation_time as string).substring(0, 5)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{r.pax as number}</td>
                                            <td>
                                                <span className={`fh-badge ${sb.cls}`}>{sb.label}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Units */}
                <div className="fh-card">
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                        <Building2 size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                        Unidades
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {metrics.units.map((unit: { id: string; name: string; slug: string }) => (
                            <Link
                                key={unit.id}
                                href={`/admin/unidades/${unit.id}/reservas`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    background: 'var(--brand-surface-2)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--brand-border)',
                                    textDecoration: 'none',
                                    transition: 'border-color 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <Image src="/fullhouse-logo.jpg" alt={unit.name} width={40} height={40} style={{ objectFit: 'cover' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                                            {unit.name.replace('Full House ', '')}
                                        </p>
                                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Full House</p>
                                    </div>
                                </div>
                                <ArrowRight size={14} color="var(--text-muted)" />
                            </Link>
                        ))}
                    </div>
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--brand-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)' }}>
                            <CheckCircle size={12} />
                            <span>{metrics.units.length} unidades ativas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
