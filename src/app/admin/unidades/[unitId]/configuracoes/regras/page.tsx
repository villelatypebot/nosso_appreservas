'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Save, Loader2, Settings, Users, Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Rules {
    id?: string
    unit_id: string
    min_advance_hours: number
    max_advance_days: number
    tolerance_minutes: number
    min_pax: number
    max_pax: number
    cancellation_policy: string
}

export default function RegrasPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const supabase = createClient()

    const [rules, setRules] = useState<Rules>({
        unit_id: unitId,
        min_advance_hours: 2,
        max_advance_days: 60,
        tolerance_minutes: 30,
        min_pax: 1,
        max_pax: 20,
        cancellation_policy: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('reservation_rules')
            .select('*')
            .eq('unit_id', unitId)
            .single()
        if (data) {
            setRules(data)
        }
        setLoading(false)
    }, [unitId])

    useEffect(() => { load() }, [load])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)

        const payload = {
            unit_id: unitId,
            min_advance_hours: rules.min_advance_hours,
            max_advance_days: rules.max_advance_days,
            tolerance_minutes: rules.tolerance_minutes,
            min_pax: rules.min_pax,
            max_pax: rules.max_pax,
            cancellation_policy: rules.cancellation_policy || null,
            updated_at: new Date().toISOString(),
        }

        let error
        if (rules.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await (supabase.from('reservation_rules') as any).update(payload).eq('id', rules.id)
            error = res.error
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await (supabase.from('reservation_rules') as any).insert(payload)
            error = res.error
        }

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message })
        } else {
            setMessage({ type: 'success', text: 'Regras salvas com sucesso!' })
            await load()
            setTimeout(() => setMessage(null), 4000)
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                Carregando regras...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ padding: '32px', maxWidth: '800px' }}>
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    <Settings size={22} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    Regras de Reserva
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Configure limites de pessoas, antecedência e política de cancelamento desta unidade.
                </p>
            </div>

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

            {/* Capacity Section */}
            <div className="fh-card" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--brand-orange)" />
                    Capacidade
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label className="fh-label">Mínimo de pessoas por reserva</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={1}
                            value={rules.min_pax}
                            onChange={e => setRules(r => ({ ...r, min_pax: Number(e.target.value) }))}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Quantas pessoas no mínimo para aceitar uma reserva
                        </p>
                    </div>
                    <div>
                        <label className="fh-label">Máximo de pessoas por reserva</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={1}
                            value={rules.max_pax}
                            onChange={e => setRules(r => ({ ...r, max_pax: Number(e.target.value) }))}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Limite máximo de pessoas em uma única reserva
                        </p>
                    </div>
                </div>
            </div>

            {/* Timing Section */}
            <div className="fh-card" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--brand-gold)" />
                    Tempo & Antecedência
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                        <label className="fh-label">Antecedência mínima (horas)</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={0}
                            value={rules.min_advance_hours}
                            onChange={e => setRules(r => ({ ...r, min_advance_hours: Number(e.target.value) }))}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Ex: 2h = não aceita reservas para daqui a menos de 2h
                        </p>
                    </div>
                    <div>
                        <label className="fh-label">Antecedência máxima (dias)</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={1}
                            value={rules.max_advance_days}
                            onChange={e => setRules(r => ({ ...r, max_advance_days: Number(e.target.value) }))}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Até quantos dias no futuro podem reservar
                        </p>
                    </div>
                    <div>
                        <label className="fh-label">Tolerância de atraso (min)</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={0}
                            value={rules.tolerance_minutes}
                            onChange={e => setRules(r => ({ ...r, tolerance_minutes: Number(e.target.value) }))}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Tempo de tolerância para no-show
                        </p>
                    </div>
                </div>
            </div>

            {/* Cancellation Policy */}
            <div className="fh-card" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--color-danger)" />
                    Política de Cancelamento
                </h2>
                <textarea
                    className="fh-input"
                    rows={4}
                    value={rules.cancellation_policy || ''}
                    onChange={e => setRules(r => ({ ...r, cancellation_policy: e.target.value }))}
                    placeholder="Ex: A reserva pode ser cancelada com até 4 horas de antecedência sem custo."
                    style={{ resize: 'vertical' }}
                />
            </div>

            {/* Info box */}
            <div style={{
                padding: '16px', marginBottom: '20px',
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px', color: 'var(--text-secondary)',
            }}>
                <strong style={{ color: 'var(--brand-gold)' }}>💡 Como funciona o bloqueio de lotação:</strong>
                <p style={{ marginTop: '6px' }}>
                    Quando o número de pessoas reservadas para uma data atingir o <strong>máx. pax por slot</strong> configurado nos Horários,
                    aquela data será automaticamente marcada como indisponível no calendário de reservas.
                    Use a aba <strong>Bloqueios</strong> para bloquear datas manualmente (feriados, eventos, etc).
                </p>
            </div>

            {/* Save */}
            <button
                className="fh-btn fh-btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ minWidth: '180px' }}
            >
                {saving ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                ) : (
                    <><Save size={14} /> Salvar Regras</>
                )}
            </button>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
