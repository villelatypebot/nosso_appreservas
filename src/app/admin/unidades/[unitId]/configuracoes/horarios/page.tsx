'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Save, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dayOfWeekLabel, generateTimeSlots, formatTime } from '@/lib/utils'
import type { TimeSlot } from '@/lib/supabase/types'

export default function HorariosPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const supabase = createClient()

    const [slots, setSlots] = useState<TimeSlot[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        day_of_week: 5,
        open_time: '18:00',
        close_time: '22:00',
        slot_interval_minutes: 30,
        max_pax_per_slot: 60,
    })

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.from('time_slots').select('*').eq('unit_id', unitId).order('day_of_week').order('open_time')
        setSlots(data || [])
        setLoading(false)
    }, [unitId])

    useEffect(() => { load() }, [load])

    const save = async () => {
        setSaving('new')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('time_slots').insert({ ...form, unit_id: unitId, is_active: true } as any)
        setShowForm(false)
        await load()
        setSaving(null)
    }

    const remove = async (id: string) => {
        if (!confirm('Remover este horário?')) return
        await supabase.from('time_slots').delete().eq('id', id)
        await load()
    }

    const toggleActive = async (slot: TimeSlot) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('time_slots') as any).update({ is_active: !slot.is_active }).eq('id', slot.id)
        await load()
    }

    const byDay: Record<number, TimeSlot[]> = {}
    for (const slot of slots) {
        if (!byDay[slot.day_of_week]) byDay[slot.day_of_week] = []
        byDay[slot.day_of_week].push(slot)
    }

    return (
        <div style={{ padding: '32px', maxWidth: '800px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px' }}>Horários de Funcionamento</h1>
                <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(s => !s)}>
                    <Plus size={14} /> Adicionar
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Configure os horários disponíveis para reserva por dia da semana.
            </p>

            {/* Create form */}
            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Novo horário</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                        <div>
                            <label className="fh-label">Dia da semana</label>
                            <select className="fh-input" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}>
                                {[0, 1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{dayOfWeekLabel(d)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="fh-label">Abertura</label>
                            <input className="fh-input" type="time" value={form.open_time} onChange={e => setForm(f => ({ ...f, open_time: e.target.value }))} />
                        </div>
                        <div>
                            <label className="fh-label">Fechamento</label>
                            <input className="fh-input" type="time" value={form.close_time} onChange={e => setForm(f => ({ ...f, close_time: e.target.value }))} />
                        </div>
                        <div>
                            <label className="fh-label">Intervalo entre slots (min)</label>
                            <select className="fh-input" value={form.slot_interval_minutes} onChange={e => setForm(f => ({ ...f, slot_interval_minutes: Number(e.target.value) }))}>
                                {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="fh-label">Máx. pax por slot</label>
                            <input className="fh-input" type="number" min={1} value={form.max_pax_per_slot} onChange={e => setForm(f => ({ ...f, max_pax_per_slot: Number(e.target.value) }))} />
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ marginBottom: '20px' }}>
                        <label className="fh-label">Preview dos slots gerados</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {generateTimeSlots(form.open_time, form.close_time, form.slot_interval_minutes).map(t => (
                                <span key={t} style={{
                                    padding: '4px 10px',
                                    background: 'rgba(201,168,76,0.1)',
                                    border: '1px solid rgba(201,168,76,0.25)',
                                    borderRadius: '99px',
                                    fontSize: '12px',
                                    color: 'var(--brand-gold)',
                                }}>{t}</span>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="fh-btn fh-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        <button className="fh-btn fh-btn-primary" onClick={save} disabled={saving === 'new'}>
                            {saving === 'new' ? <><Loader2 size={14} />Salvando...</> : <><Save size={14} />Salvar horário</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Slots by day */}
            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : Object.keys(byDay).length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhum horário configurado ainda.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[0, 1, 2, 3, 4, 5, 6].filter(d => byDay[d]).map(day => (
                        <div key={day} className="fh-card">
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--brand-border)',
                            }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{dayOfWeekLabel(day)}</h3>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{byDay[day].length} configuração(ões)</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {byDay[day].map(slot => (
                                    <div key={slot.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 14px',
                                        background: 'var(--brand-surface-2)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${slot.is_active ? 'var(--brand-border)' : 'transparent'}`,
                                        opacity: slot.is_active ? 1 : 0.5,
                                    }}>
                                        <div style={{ flex: 1, display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-gold)' }}>
                                                {formatTime(slot.open_time)} → {formatTime(slot.close_time)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Intervalos de {slot.slot_interval_minutes}min
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Máx. {slot.max_pax_per_slot} pax/slot
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                className={`fh-btn fh-btn-sm ${slot.is_active ? 'fh-btn-ghost' : 'fh-btn-outline'}`}
                                                onClick={() => toggleActive(slot)}
                                            >
                                                {slot.is_active ? 'Pausar' : 'Ativar'}
                                            </button>
                                            <button className="fh-btn fh-btn-sm fh-btn-danger" onClick={() => remove(slot.id)}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
