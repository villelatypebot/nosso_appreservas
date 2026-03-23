'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Loader2, CalendarX, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface DateBlock {
    id: string
    unit_id: string
    block_date: string
    start_time: string | null
    end_time: string | null
    reason: string | null
    created_at: string
}

export default function BloqueiosPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const supabase = createClient()

    const [blocks, setBlocks] = useState<DateBlock[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [form, setForm] = useState({
        block_date: '',
        start_time: '',
        end_time: '',
        reason: '',
    })

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('date_blocks')
            .select('*')
            .eq('unit_id', unitId)
            .order('block_date', { ascending: true })
        setBlocks(data || [])
        setLoading(false)
    }, [unitId])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!form.block_date) return
        setSaving(true)
        setMessage(null)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('date_blocks') as any).insert({
            unit_id: unitId,
            block_date: form.block_date,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            reason: form.reason || null,
        })

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao criar bloqueio: ' + error.message })
        } else {
            setMessage({ type: 'success', text: 'Data bloqueada com sucesso!' })
            setShowForm(false)
            setForm({ block_date: '', start_time: '', end_time: '', reason: '' })
            await load()
            setTimeout(() => setMessage(null), 4000)
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este bloqueio?')) return
        await supabase.from('date_blocks').delete().eq('id', id)
        setMessage({ type: 'success', text: 'Bloqueio removido.' })
        await load()
        setTimeout(() => setMessage(null), 3000)
    }

    const today = new Date().toISOString().split('T')[0]
    const futureBlocks = blocks.filter(b => b.block_date >= today)
    const pastBlocks = blocks.filter(b => b.block_date < today)

    return (
        <div className="admin-page-shell narrow">
            <div className="admin-page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>
                    <CalendarX size={22} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    Bloqueios de Data
                </h1>
                <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(s => !s)}>
                    <Plus size={14} /> Novo Bloqueio
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Bloqueie datas específicas para feriados, eventos ou manutenção. Datas bloqueadas não aparecerão para reserva.
            </p>

            {message && (
                <div style={{
                    background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,.25)' : 'rgba(220,38,38,.25)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px', fontSize: '13px',
                    color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Novo Bloqueio</h3>
                    <div className="admin-form-grid-3" style={{ marginBottom: '14px' }}>
                        <div>
                            <label className="fh-label">Data *</label>
                            <input
                                className="fh-input"
                                type="date"
                                value={form.block_date}
                                onChange={e => setForm(f => ({ ...f, block_date: e.target.value }))}
                                min={today}
                                required
                            />
                        </div>
                        <div>
                            <label className="fh-label">Hora início (opcional)</label>
                            <input
                                className="fh-input"
                                type="time"
                                value={form.start_time}
                                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                            />
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Vazio = dia inteiro</p>
                        </div>
                        <div>
                            <label className="fh-label">Hora fim (opcional)</label>
                            <input
                                className="fh-input"
                                type="time"
                                value={form.end_time}
                                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="fh-label">Motivo (opcional)</label>
                        <input
                            className="fh-input"
                            value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            placeholder="Ex: Feriado, evento privado, manutenção..."
                        />
                    </div>
                    <div className="admin-form-actions">
                        <button className="fh-btn fh-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        <button className="fh-btn fh-btn-primary" onClick={handleCreate} disabled={saving || !form.block_date}>
                            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><CalendarX size={14} /> Bloquear Data</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Active Blocks */}
            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : futureBlocks.length === 0 && pastBlocks.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <CalendarX size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhum bloqueio configurado.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Clique em &quot;Novo Bloqueio&quot; para bloquear uma data.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {futureBlocks.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                Bloqueios Ativos ({futureBlocks.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {futureBlocks.map(block => (
                                    <div key={block.id} className="fh-card" style={{
                                        padding: '14px 18px',
                                    }}>
                                        <div className="admin-item-row">
                                            <div className="admin-item-main" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '10px',
                                                    background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--color-danger)', fontWeight: 700, fontSize: '13px',
                                                }}>
                                                    {new Date(block.block_date + 'T00:00:00').getDate()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                                                        {formatDate(block.block_date, "EEEE, dd 'de' MMMM")}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {block.start_time && block.end_time ? (
                                                            <span>⏰ {block.start_time.substring(0, 5)} — {block.end_time.substring(0, 5)}</span>
                                                        ) : (
                                                            <span>📅 Dia inteiro</span>
                                                        )}
                                                        {block.reason && <span>• {block.reason}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="admin-item-actions">
                                                <button className="fh-btn fh-btn-sm fh-btn-danger" onClick={() => handleDelete(block.id)} title="Remover">
                                                    <Trash2 size={12} /> Remover
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pastBlocks.length > 0 && (
                        <div style={{ opacity: 0.5 }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                Bloqueios Passados ({pastBlocks.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pastBlocks.map(block => (
                                    <div key={block.id} className="fh-card" style={{
                                        padding: '12px 18px',
                                    }}>
                                        <div className="admin-item-row">
                                            <div className="admin-item-main">
                                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                    {formatDate(block.block_date)} {block.reason && `— ${block.reason}`}
                                                </p>
                                            </div>
                                            <div className="admin-item-actions">
                                                <button className="fh-btn fh-btn-sm fh-btn-ghost" onClick={() => handleDelete(block.id)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
