import { createClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, Users, AlertTriangle, Calendar } from 'lucide-react'

interface Props {
    params: Promise<{ unitId: string }>
}

async function getRelatorioData(supabase: Awaited<ReturnType<typeof createClient>>, unitId: string) {
    const today = new Date()
    const last30 = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]
    const last7 = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]

    const [allRes, last7Res, byStatusRes] = await Promise.all([
        supabase
            .from('reservations')
            .select('id, reservation_date, reservation_time, pax, status, created_at')
            .eq('unit_id', unitId)
            .gte('reservation_date', last30),
        supabase
            .from('reservations')
            .select('id, reservation_date, pax, status')
            .eq('unit_id', unitId)
            .gte('reservation_date', last7),
        supabase
            .from('reservations')
            .select('status')
            .eq('unit_id', unitId)
            .gte('reservation_date', last30),
    ])

    const all = allRes.data || []
    const last7Data = last7Res.data || []

    // By day (last 7)
    const byDay: Record<string, { confirmed: number; no_show: number; pax: number }> = {}
    for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() - i * 86400000)
        const key = d.toISOString().split('T')[0]
        byDay[key] = { confirmed: 0, no_show: 0, pax: 0 }
    }
    for (const r of last7Data) {
        const key = r.reservation_date
        if (!byDay[key]) continue
        if (['confirmed', 'seated'].includes(r.status)) { byDay[key].confirmed++; byDay[key].pax += r.pax }
        if (r.status === 'no_show') byDay[key].no_show++
    }

    // By hour
    const byHour: Record<string, number> = {}
    for (const r of all) {
        const h = String(r.reservation_time).substring(0, 5)
        byHour[h] = (byHour[h] || 0) + 1
    }
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]

    // Status counts
    const statusCounts = (byStatusRes.data || []).reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
    }, {})
    const totalInPeriod = all.length
    const noShowRate = totalInPeriod > 0
        ? Math.round(((statusCounts.no_show || 0) / totalInPeriod) * 100)
        : 0
    const conversionRate = totalInPeriod > 0
        ? Math.round((((statusCounts.confirmed || 0) + (statusCounts.seated || 0)) / totalInPeriod) * 100)
        : 0
    const totalPax = all.reduce((a, r) => a + r.pax, 0)

    return { byDay, peakHour, statusCounts, noShowRate, conversionRate, totalPax, totalInPeriod }
}

export default async function RelatoriosPage({ params }: Props) {
    const { unitId } = await params
    const supabase = await createClient()
    const data = await getRelatorioData(supabase, unitId)

    const days = Object.entries(data.byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, counts]) => ({
            date,
            label: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
            ...counts,
        }))

    const maxConfirmed = Math.max(...days.map(d => d.confirmed), 1)

    const statusColor: Record<string, string> = {
        confirmed: 'var(--color-success)',
        seated: 'var(--color-info)',
        pending: 'var(--color-warning)',
        no_show: 'var(--color-danger)',
        cancelled: 'var(--text-muted)',
    }
    const statusLabels: Record<string, string> = {
        confirmed: 'Confirmadas',
        seated: 'Sentados',
        pending: 'Pendentes',
        no_show: 'No-show',
        cancelled: 'Canceladas',
    }

    return (
        <div className="admin-page-shell medium">
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Relatórios</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Dados dos últimos 30 dias</p>
            </div>

            {/* KPI cards */}
            <div className="admin-stat-grid">
                {[
                    { icon: <Calendar size={20} color="var(--brand-gold)" />, bg: 'rgba(201,168,76,0.1)', value: data.totalInPeriod, label: 'Total de reservas' },
                    { icon: <Users size={20} color="var(--color-info)" />, bg: 'var(--color-info-bg)', value: data.totalPax, label: 'Total de pessoas' },
                    { icon: <TrendingUp size={20} color="var(--color-success)" />, bg: 'var(--color-success-bg)', value: `${data.conversionRate}%`, label: 'Taxa de conversão' },
                    { icon: <AlertTriangle size={20} color="var(--color-danger)" />, bg: 'var(--color-danger-bg)', value: `${data.noShowRate}%`, label: 'Taxa de no-show' },
                ].map((card, i) => (
                    <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="stat-icon" style={{ background: card.bg }}>{card.icon}</div>
                        <div className="stat-value">{card.value}</div>
                        <div className="stat-label">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="admin-split-grid">
                {/* Bar chart — last 7 days */}
                <div className="fh-card">
                    <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={16} color="var(--brand-gold)" />
                        Reservas nos últimos 7 dias
                    </h2>
                    <div className="admin-chart-scroll">
                        <div className="admin-chart-inner" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
                            {days.map((day) => {
                                const heightPct = day.confirmed / maxConfirmed
                                return (
                                    <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 700 }}>
                                            {day.confirmed > 0 ? day.confirmed : ''}
                                        </span>
                                        <div style={{
                                            width: '100%',
                                            height: `${Math.max(4, heightPct * 120)}px`,
                                            background: 'linear-gradient(180deg, var(--brand-gold-light), var(--brand-gold-dark))',
                                            borderRadius: '6px 6px 0 0',
                                            transition: 'height 0.5s ease',
                                            position: 'relative',
                                        }}>
                                            {day.no_show > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0, left: 0, right: 0,
                                                    height: `${(day.no_show / Math.max(day.confirmed + day.no_show, 1)) * 100}%`,
                                                    background: 'var(--color-danger)',
                                                    borderRadius: '0 0 6px 6px',
                                                    opacity: 0.7,
                                                }} />
                                            )}
                                        </div>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{day.label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="admin-inline-stack" style={{ marginTop: '12px', fontSize: '11px', gap: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--brand-gold)', display: 'inline-block' }} />
                            Confirmadas
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-danger)', display: 'inline-block' }} />
                            No-show
                        </span>
                    </div>
                </div>

                {/* Status breakdown */}
                <div className="fh-card">
                    <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Por status</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(data.statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                            const pct = data.totalInPeriod > 0 ? Math.round((count / data.totalInPeriod) * 100) : 0
                            return (
                                <div key={status}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span className={`fh-badge badge-${status}`} style={{ fontSize: '10px' }}>
                                            {statusLabels[status] || status}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: '5px', background: 'var(--brand-surface-3)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            background: statusColor[status] || '#666',
                                            borderRadius: '99px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {data.peakHour && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px',
                            background: 'rgba(201,168,76,0.06)',
                            border: '1px solid rgba(201,168,76,0.15)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Horário de pico
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-gold)' }}>
                                {data.peakHour[0]}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.peakHour[1]} reservas</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
