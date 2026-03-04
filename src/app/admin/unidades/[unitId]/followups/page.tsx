'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Bell, Loader2, MessageSquare, Mail, Phone } from 'lucide-react'
import type { FollowUpRule } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

const TRIGGER_EVENTS = [
    { value: 'after_confirmation', label: 'Após confirmação' },
    { value: 'before_reservation', label: 'Antes da reserva' },
    { value: 'after_no_show', label: 'Após no-show' },
    { value: 'after_cancellation', label: 'Após cancelamento' },
]

const CHANNELS = [
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={14} /> },
    { value: 'email', label: 'E-mail', icon: <Mail size={14} /> },
    { value: 'sms', label: 'SMS', icon: <Phone size={14} /> },
]

const VARIABLES = ['{{nome}}', '{{data}}', '{{hora}}', '{{unidade}}', '{{pax}}', '{{codigo}}']

export default function FollowUpsPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const supabase = createClient()

    const [rules, setRules] = useState<FollowUpRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        trigger_event: 'after_confirmation',
        offset_minutes: 0,
        channel: 'whatsapp',
        message_template: 'Olá {{nome}}! Sua reserva no {{unidade}} está confirmada para {{data}} às {{hora}}. Esperamos por você! 🎉',
        is_active: true,
    })

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.from('follow_up_rules').select('*').eq('unit_id', unitId).order('trigger_event')
        setRules(data || [])
        setLoading(false)
    }, [unitId])

    useEffect(() => { load() }, [load])

    const save = async () => {
        if (!form.name || !form.message_template) return
        setSaving(true)
        await supabase.from('follow_up_rules').insert({ ...form, unit_id: unitId })
        setForm({
            name: '',
            trigger_event: 'after_confirmation',
            offset_minutes: 0,
            channel: 'whatsapp',
            message_template: 'Olá {{nome}}! Sua reserva no {{unidade}} está confirmada para {{data}} às {{hora}}. Esperamos por você! 🎉',
            is_active: true,
        })
        setShowForm(false)
        await load()
        setSaving(false)
    }

    const deleteRule = async (id: string) => {
        if (!confirm('Excluir este follow-up?')) return
        await supabase.from('follow_up_rules').delete().eq('id', id)
        await load()
    }

    const toggleActive = async (rule: FollowUpRule) => {
        await supabase.from('follow_up_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
        await load()
    }

    const insertVariable = (v: string) => {
        setForm(f => ({ ...f, message_template: f.message_template + v }))
    }

    const offsetLabel = (offset: number, trigger: string) => {
        if (trigger === 'before_reservation') {
            const h = Math.abs(offset) / 60
            return h >= 1 ? `${h}h antes` : `${Math.abs(offset)}min antes`
        }
        if (offset === 0) return 'Imediato'
        const h = offset / 60
        return h >= 1 ? `${h}h após` : `${offset}min após`
    }

    const channelIcon = (channel: string) => {
        const map: Record<string, React.ReactNode> = {
            whatsapp: <MessageSquare size={14} color="var(--color-success)" />,
            email: <Mail size={14} color="var(--color-info)" />,
            sms: <Phone size={14} color="var(--color-warning)" />,
        }
        return map[channel] || null
    }

    return (
        <div style={{ padding: '32px', maxWidth: '900px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px' }}>Follow-ups & Lembretes</h1>
                <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(s => !s)}>
                    <Plus size={14} /> Nova regra
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Configure mensagens automáticas enviadas aos clientes em diferentes momentos da reserva.
            </p>

            {/* Create Form */}
            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Nova regra de follow-up</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                            <label className="fh-label">Nome da regra</label>
                            <input className="fh-input" placeholder="Ex: Lembrete 24h" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="fh-label">Canal</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {CHANNELS.map(ch => (
                                    <button
                                        key={ch.value}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, channel: ch.value }))}
                                        style={{
                                            flex: 1,
                                            padding: '10px 6px',
                                            border: `1px solid ${form.channel === ch.value ? 'var(--brand-gold)' : 'var(--brand-border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: form.channel === ch.value ? 'rgba(201,168,76,0.1)' : 'var(--brand-surface-2)',
                                            color: form.channel === ch.value ? 'var(--brand-gold)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {ch.icon}
                                        {ch.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="fh-label">Gatilho</label>
                            <select className="fh-input" value={form.trigger_event} onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value }))}>
                                {TRIGGER_EVENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="fh-label">
                                {form.trigger_event === 'before_reservation' ? 'Minutos antes' : 'Minutos após'}
                            </label>
                            <input
                                className="fh-input"
                                type="number"
                                min={0}
                                placeholder="0 = imediato"
                                value={form.offset_minutes}
                                onChange={e => setForm(f => ({ ...f, offset_minutes: Number(e.target.value) }))}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {form.trigger_event === 'before_reservation' ? `Enviar ${form.offset_minutes / 60}h antes da reserva` : `Enviar ${form.offset_minutes}min após o evento`}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label className="fh-label">Mensagem</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {VARIABLES.map(v => (
                                <button key={v} type="button" onClick={() => insertVariable(v)} style={{
                                    padding: '3px 8px',
                                    background: 'var(--brand-surface-3)',
                                    border: '1px solid var(--brand-border)',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    color: 'var(--brand-gold)',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                }}>{v}</button>
                            ))}
                        </div>
                        <textarea
                            className="fh-input"
                            rows={4}
                            placeholder="Texto da mensagem com variáveis..."
                            value={form.message_template}
                            onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="fh-btn fh-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        <button className="fh-btn fh-btn-primary" onClick={save} disabled={saving || !form.name}>
                            {saving ? <><Loader2 size={14} />Salvando...</> : 'Salvar regra'}
                        </button>
                    </div>
                </div>
            )}

            {/* Rules List */}
            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : rules.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhuma regra de follow-up ainda.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Crie regras para enviar lembretes automáticos aos seus clientes.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rules.map((rule) => (
                        <div key={rule.id} className="fh-card" style={{
                            display: 'flex',
                            gap: '14px',
                            padding: '16px 20px',
                            opacity: rule.is_active ? 1 : 0.6,
                            borderColor: rule.is_active ? 'var(--brand-border)' : 'transparent',
                        }}>
                            {/* Channel icon */}
                            <div style={{
                                width: '40px', height: '40px', flexShrink: 0,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--brand-surface-2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {channelIcon(rule.channel)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{rule.name}</span>
                                    {!rule.is_active && <span className="fh-badge" style={{ background: 'rgba(100,100,100,0.12)', color: 'var(--text-muted)', fontSize: '10px' }}>Inativo</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    <span>{TRIGGER_EVENTS.find(t => t.value === rule.trigger_event)?.label}</span>
                                    <span>·</span>
                                    <span>{offsetLabel(rule.offset_minutes, rule.trigger_event)}</span>
                                    <span>·</span>
                                    <span style={{ textTransform: 'capitalize' }}>{rule.channel}</span>
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--brand-surface-2)',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    lineHeight: 1.5,
                                }}>
                                    {rule.message_template}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexShrink: 0 }}>
                                <button
                                    className={`fh-btn fh-btn-sm ${rule.is_active ? 'fh-btn-ghost' : 'fh-btn-outline'}`}
                                    onClick={() => toggleActive(rule)}
                                >
                                    {rule.is_active ? 'Pausar' : 'Ativar'}
                                </button>
                                <button className="fh-btn fh-btn-sm fh-btn-danger" onClick={() => deleteRule(rule.id)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
