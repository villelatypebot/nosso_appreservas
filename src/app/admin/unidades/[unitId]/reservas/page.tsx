'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Search, Filter, Plus, Check, X, Users, Clock, Calendar, RefreshCw } from 'lucide-react'
import { formatDate, statusBadgeClass, statusLabel } from '@/lib/utils'
import type { ReservationWithDetails, ReservationStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'confirmed', label: 'Confirmadas' },
    { value: 'seated', label: 'Sentados' },
    { value: 'no_show', label: 'No-show' },
    { value: 'cancelled', label: 'Canceladas' },
]

interface ApiResponse {
    data: ReservationWithDetails[]
    total: number
    page: number
    pageSize: number
}

export default function ReservasPage() {
    const params = useParams()
    const unitId = params.unitId as string

    const [data, setData] = useState<ReservationWithDetails[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [search, setSearch] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ unitId, page: String(page) })
        if (filterStatus) params.set('status', filterStatus)
        if (filterDate) params.set('date', filterDate)
        if (search) params.set('search', search)
        const res = await fetch(`/api/reservations?${params}`)
        const json: ApiResponse = await res.json()
        setData(json.data || [])
        setTotal(json.total || 0)
        setLoading(false)
    }, [unitId, page, filterStatus, filterDate, search])

    useEffect(() => { load() }, [load])

    const updateStatus = async (id: string, status: ReservationStatus) => {
        setActionLoading(id)
        await fetch('/api/reservations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        })
        await load()
        setActionLoading(null)
    }

    const totalPages = Math.ceil(total / 20)

    const actionButtons = (r: ReservationWithDetails) => {
        const disabled = actionLoading === r.id
        if (r.status === 'pending') return (
            <div style={{ display: 'flex', gap: '6px' }}>
                <button className="fh-btn fh-btn-sm fh-btn-outline" disabled={disabled}
                    onClick={() => updateStatus(r.id, 'confirmed')} title="Confirmar">
                    <Check size={12} /> Confirmar
                </button>
                <button className="fh-btn fh-btn-sm fh-btn-danger" disabled={disabled}
                    onClick={() => updateStatus(r.id, 'cancelled')} title="Cancelar">
                    <X size={12} />
                </button>
            </div>
        )
        if (r.status === 'confirmed') return (
            <div style={{ display: 'flex', gap: '6px' }}>
                <button className="fh-btn fh-btn-sm" disabled={disabled}
                    style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid rgba(91,141,239,0.25)', fontSize: '12px', padding: '5px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={() => updateStatus(r.id, 'seated')}>
                    Sentar
                </button>
                <button className="fh-btn fh-btn-sm fh-btn-danger" disabled={disabled}
                    onClick={() => updateStatus(r.id, 'no_show')} title="No-show">
                    No-show
                </button>
            </div>
        )
        return null
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1400px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Reservas</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{total} reservas encontradas</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={load}>
                        <RefreshCw size={14} />
                    </button>
                    <button className="fh-btn fh-btn-primary fh-btn-sm">
                        <Plus size={14} /> Nova reserva
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="fh-input"
                        style={{ paddingLeft: '36px' }}
                        placeholder="Buscar por nome ou código..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                    />
                </div>
                <input
                    className="fh-input"
                    type="date"
                    style={{ width: '160px' }}
                    value={filterDate}
                    onChange={e => { setFilterDate(e.target.value); setPage(1) }}
                />
                <select
                    className="fh-input"
                    style={{ width: '180px', cursor: 'pointer' }}
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="fh-card" style={{ padding: 0, overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                        Carregando...
                    </div>
                ) : (
                    <table className="fh-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Data</th>
                                <th><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />Hora</th>
                                <th><Users size={12} style={{ display: 'inline', marginRight: '4px' }} />Pax</th>
                                <th>Ambiente</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        Nenhuma reserva encontrada
                                    </td>
                                </tr>
                            )}
                            {data.map((r) => {
                                const customer = r.customers as { name: string; phone: string } | undefined
                                const env = r.environments as { name: string } | null | undefined
                                return (
                                    <tr key={r.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700 }}>
                                            {r.confirmation_code}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{customer?.name || '—'}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{customer?.phone}</div>
                                        </td>
                                        <td>{formatDate(r.reservation_date)}</td>
                                        <td style={{ fontWeight: 500 }}>{String(r.reservation_time).substring(0, 5)}</td>
                                        <td style={{ textAlign: 'center' }}>{r.pax}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{env?.name || '—'}</td>
                                        <td>
                                            <span className={`fh-badge ${statusBadgeClass(r.status)}`}>
                                                {statusLabel(r.status)}
                                            </span>
                                        </td>
                                        <td>{actionButtons(r)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <div className="pagination">
                        <button className={`page-btn ${page === 1 ? 'active' : ''}`} onClick={() => setPage(1)}>«</button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className={`page-btn ${page === totalPages ? 'active' : ''}`} onClick={() => setPage(totalPages)}>»</button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
