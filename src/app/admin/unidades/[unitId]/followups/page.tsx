'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
    Plus,
    Trash2,
    Bell,
    Loader2,
    MessageSquare,
    Mail,
    Phone,
    Sparkles,
    Copy,
} from 'lucide-react'
import type { FollowUpRule } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

type GeneratorResult = {
    summary: string
    contextHint: string | null
    detectedGoal: 'reply' | 'clear_doubt' | 'reserve'
    suggestions: Array<{
        strategy: string
        title: string
        message: string
    }>
}

type AssistantResult = {
    intent: 'availability_check' | 'link_request' | 'general_support'
    action:
    | 'clarify_unit'
    | 'ask_missing_details'
    | 'send_reservation_link'
    | 'confirm_availability_and_send_link'
    | 'offer_alternative_times'
    | 'inform_unavailable'
    | 'continue_support'
    message: string
    reservationLink: string | null
    missingFields: string[]
    availability: {
        checked: boolean
        isAvailable: boolean | null
        reason: string | null
        operatingTimes: string[]
        availableTimes: string[]
    }
}

const TRIGGER_EVENTS = [
    { value: 'after_inquiry', label: 'Apos duvida / interesse' },
    { value: 'after_link_sent', label: 'Apos envio do link' },
    { value: 'after_quote_request', label: 'Apos pedido de preco ou desconto' },
    { value: 'after_confirmation', label: 'Apos confirmacao' },
    { value: 'before_reservation', label: 'Antes da reserva' },
    { value: 'after_no_show', label: 'Apos no-show' },
    { value: 'after_cancellation', label: 'Apos cancelamento' },
]

const CHANNELS = [
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={14} /> },
    { value: 'email', label: 'E-mail', icon: <Mail size={14} /> },
    { value: 'sms', label: 'SMS', icon: <Phone size={14} /> },
]

const VARIABLES = [
    '{{nome}}',
    '{{data}}',
    '{{hora}}',
    '{{unidade}}',
    '{{pax}}',
    '{{codigo}}',
    '{{ultima_duvida}}',
    '{{resumo_conversa}}',
    '{{link_reserva}}',
    '{{proximo_passo}}',
]

const DEFAULT_RULE_FORM = {
    name: '',
    trigger_event: 'after_inquiry',
    offset_minutes: 30,
    channel: 'whatsapp',
    message_template: '{{nome}}, ficou em aberto aqui sua duvida sobre {{ultima_duvida}}. Se fizer sentido, eu continuo daqui com voce e te ajudo com o proximo passo.',
    is_active: true,
}

const DEFAULT_GENERATOR_FORM = {
    customerName: 'Lucas',
    unitName: '',
    reservationDate: '',
    pax: '2',
    reservationLink: '',
    goal: 'auto',
    availabilityHint: 'fast_filling',
    messageHistoryText: [
        'CLIENTE: bariatrico tem desconto?',
        'ATENDENTE: Temos sim, Lucas!',
        'ATENDENTE: Pessoas que fizeram a cirurgia bariatrica tem 50% de desconto no valor do rodizio.',
    ].join('\n'),
}

function buildRecommendedRules(unitId: string) {
    return [
        {
            unit_id: unitId,
            name: 'Retomada consultiva',
            trigger_event: 'after_inquiry',
            offset_minutes: 30,
            channel: 'whatsapp',
            message_template: '{{nome}}, ficou em aberto aqui sua duvida sobre {{ultima_duvida}}. Se fizer sentido, eu continuo daqui com voce e te ajudo com o proximo passo.',
            is_active: true,
        },
        {
            unit_id: unitId,
            name: 'Ajuda objetiva com proximo passo',
            trigger_event: 'after_inquiry',
            offset_minutes: 180,
            channel: 'whatsapp',
            message_template: '{{nome}}, se ainda fizer sentido para voce, eu posso te orientar de forma direta e ja te mostrar o melhor proximo passo para reservar.',
            is_active: true,
        },
        {
            unit_id: unitId,
            name: 'Urgencia leve apos link',
            trigger_event: 'after_link_sent',
            offset_minutes: 1440,
            channel: 'whatsapp',
            message_template: '{{nome}}, te aviso porque as vagas costumam girar rapido no {{unidade}}. Se ainda quiser seguir, eu te ajudo a finalizar por aqui. {{link_reserva}}',
            is_active: true,
        },
        {
            unit_id: unitId,
            name: 'Reabertura suave',
            trigger_event: 'after_inquiry',
            offset_minutes: 2880,
            channel: 'whatsapp',
            message_template: '{{nome}}, continuo por aqui caso ainda queira ajuda com {{resumo_conversa}}.',
            is_active: true,
        },
        {
            unit_id: unitId,
            name: 'Recuperacao de interesse',
            trigger_event: 'after_quote_request',
            offset_minutes: 720,
            channel: 'whatsapp',
            message_template: '{{nome}}, se a sua duvida ainda for sobre {{ultima_duvida}}, eu posso te responder de forma direta e te mostrar o caminho mais rapido para reservar.',
            is_active: true,
        },
    ]
}

export default function FollowUpsPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const [supabase] = useState(() => createClient())

    const [rules, setRules] = useState<FollowUpRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const [generatorLoading, setGeneratorLoading] = useState(false)
    const [generatorResult, setGeneratorResult] = useState<GeneratorResult | null>(null)
    const [assistantLoading, setAssistantLoading] = useState(false)
    const [assistantResult, setAssistantResult] = useState<AssistantResult | null>(null)
    const [form, setForm] = useState(DEFAULT_RULE_FORM)
    const [generatorForm, setGeneratorForm] = useState(DEFAULT_GENERATOR_FORM)

    const load = useCallback(async () => {
        setLoading(true)

        const [{ data: rulesData }, { data: unitData }] = await Promise.all([
            supabase.from('follow_up_rules').select('*').eq('unit_id', unitId).order('trigger_event').order('offset_minutes'),
            supabase.from('units').select('name').eq('id', unitId).maybeSingle(),
        ])

        setRules(rulesData || [])
        if (unitData?.name) {
            setGeneratorForm(current => current.unitName ? current : { ...current, unitName: unitData.name })
        }
        setLoading(false)
    }, [supabase, unitId])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [load])

    const save = async () => {
        if (!form.name || !form.message_template) return
        setSaving(true)
        await supabase.from('follow_up_rules').insert({ ...form, unit_id: unitId })
        setForm(DEFAULT_RULE_FORM)
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

    const insertVariable = (variable: string) => {
        setForm(current => ({ ...current, message_template: current.message_template + variable }))
    }

    const insertRecommendedRules = async () => {
        setSeeding(true)
        const presets = buildRecommendedRules(unitId)
        const existingNames = new Set(rules.map(rule => rule.name))
        const missingRules = presets.filter(rule => !existingNames.has(rule.name))

        if (missingRules.length === 0) {
            alert('A sequencia recomendada ja esta cadastrada.')
            setSeeding(false)
            return
        }

        const { error } = await supabase.from('follow_up_rules').insert(missingRules)
        if (error) {
            alert('Nao foi possivel inserir a sequencia recomendada.')
        } else {
            await load()
        }
        setSeeding(false)
    }

    const generateSuggestions = async () => {
        setGeneratorLoading(true)
        setGeneratorResult(null)

        const response = await fetch('/api/followups/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: generatorForm.customerName,
                unitName: generatorForm.unitName,
                reservationDate: generatorForm.reservationDate || null,
                pax: Number(generatorForm.pax) || null,
                reservationLink: generatorForm.reservationLink || null,
                goal: generatorForm.goal,
                availabilityHint: generatorForm.availabilityHint,
                messageHistoryText: generatorForm.messageHistoryText,
            }),
        })

        const json = await response.json()
        if (!response.ok) {
            alert(json.error || 'Nao foi possivel gerar as sugestoes.')
            setGeneratorLoading(false)
            return
        }

        setGeneratorResult(json)
        setGeneratorLoading(false)
    }

    const runAssistant = async () => {
        setAssistantLoading(true)
        setAssistantResult(null)

        const response = await fetch('/api/conversation/assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: generatorForm.customerName,
                unitName: generatorForm.unitName,
                reservationDate: generatorForm.reservationDate || null,
                pax: Number(generatorForm.pax) || null,
                reservationLink: generatorForm.reservationLink || null,
                messageHistoryText: generatorForm.messageHistoryText,
            }),
        })

        const json = await response.json()
        if (!response.ok) {
            alert(json.error || 'Nao foi possivel rodar o assistente.')
            setAssistantLoading(false)
            return
        }

        setAssistantResult(json)
        setAssistantLoading(false)
    }

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            alert('Nao foi possivel copiar a mensagem.')
        }
    }

    const offsetLabel = (offset: number, trigger: string) => {
        if (trigger === 'before_reservation') {
            const hours = Math.abs(offset) / 60
            return hours >= 1 ? `${hours}h antes` : `${Math.abs(offset)}min antes`
        }

        if (offset === 0) return 'Imediato'

        const hours = offset / 60
        return hours >= 1 ? `${hours}h apos` : `${offset}min apos`
    }

    const channelIcon = (channel: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            whatsapp: <MessageSquare size={14} color="var(--color-success)" />,
            email: <Mail size={14} color="var(--color-info)" />,
            sms: <Phone size={14} color="var(--color-warning)" />,
        }

        return iconMap[channel] || null
    }

    return (
        <div className="admin-page-shell medium">
            <div className="admin-page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px' }}>Follow-ups & Lembretes</h1>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={insertRecommendedRules} disabled={seeding}>
                        {seeding ? <><Loader2 size={14} />Inserindo...</> : <><Sparkles size={14} />Sequencia recomendada</>}
                    </button>
                    <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(current => !current)}>
                        <Plus size={14} /> Nova regra
                    </button>
                </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Agora voce pode testar copy contextual, variar a abordagem e cadastrar uma sequencia comercial menos repetitiva.
            </p>

            <div className="fh-card" style={{ marginBottom: '24px', borderColor: 'rgba(201,168,76,0.35)' }}>
                <div className="admin-page-header" style={{ marginBottom: '18px', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Gerador contextual de follow-up</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Cole os ultimos chats e o sistema gera mensagens diferentes, com contexto e sem repetir a ultima abordagem.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={generateSuggestions} disabled={generatorLoading}>
                            {generatorLoading ? <><Loader2 size={14} />Gerando...</> : <><Sparkles size={14} />Gerar 3 sugestoes</>}
                        </button>
                        <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={runAssistant} disabled={assistantLoading}>
                            {assistantLoading ? <><Loader2 size={14} />Analisando...</> : 'Testar resposta operacional'}
                        </button>
                    </div>
                </div>

                <div className="admin-form-grid-2" style={{ marginBottom: '14px' }}>
                    <div>
                        <label className="fh-label">Nome do cliente</label>
                        <input
                            className="fh-input"
                            value={generatorForm.customerName}
                            onChange={event => setGeneratorForm(current => ({ ...current, customerName: event.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="fh-label">Unidade</label>
                        <input
                            className="fh-input"
                            value={generatorForm.unitName}
                            onChange={event => setGeneratorForm(current => ({ ...current, unitName: event.target.value }))}
                            placeholder="Ex: Unidade Centro"
                        />
                    </div>
                    <div>
                        <label className="fh-label">Data desejada</label>
                        <input
                            className="fh-input"
                            type="date"
                            value={generatorForm.reservationDate}
                            onChange={event => setGeneratorForm(current => ({ ...current, reservationDate: event.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="fh-label">Quantidade de pessoas</label>
                        <input
                            className="fh-input"
                            type="number"
                            min={1}
                            value={generatorForm.pax}
                            onChange={event => setGeneratorForm(current => ({ ...current, pax: event.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="fh-label">Objetivo</label>
                        <select
                            className="fh-input"
                            value={generatorForm.goal}
                            onChange={event => setGeneratorForm(current => ({ ...current, goal: event.target.value }))}
                        >
                            <option value="auto">Auto</option>
                            <option value="reply">Retomar conversa</option>
                            <option value="clear_doubt">Tirar duvida</option>
                            <option value="reserve">Levar para reserva</option>
                        </select>
                    </div>
                    <div>
                        <label className="fh-label">Urgencia</label>
                        <select
                            className="fh-input"
                            value={generatorForm.availabilityHint}
                            onChange={event => setGeneratorForm(current => ({ ...current, availabilityHint: event.target.value }))}
                        >
                            <option value="fast_filling">Vagas giram rapido</option>
                            <option value="normal">Normal</option>
                            <option value="auto">Auto</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label className="fh-label">Link da reserva</label>
                    <input
                        className="fh-input"
                        value={generatorForm.reservationLink}
                        onChange={event => setGeneratorForm(current => ({ ...current, reservationLink: event.target.value }))}
                        placeholder="https://..."
                    />
                </div>

                <div>
                    <label className="fh-label">Historico recente da conversa</label>
                    <textarea
                        className="fh-input"
                        rows={7}
                        value={generatorForm.messageHistoryText}
                        onChange={event => setGeneratorForm(current => ({ ...current, messageHistoryText: event.target.value }))}
                        placeholder={[
                            'CLIENTE: bariatrico tem desconto?',
                            'ATENDENTE: Temos sim, Lucas!',
                        ].join('\n')}
                        style={{ resize: 'vertical' }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Use uma linha por mensagem, sempre com prefixo CLIENTE: ou ATENDENTE:.
                    </p>
                </div>

                {generatorResult && (
                    <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(201,168,76,0.08)',
                            border: '1px solid rgba(201,168,76,0.22)',
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Leitura de contexto</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{generatorResult.summary}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {generatorResult.suggestions.map((suggestion, index) => (
                                <div
                                    key={`${suggestion.strategy}-${index}`}
                                    className="fh-card"
                                    style={{ padding: '16px', background: 'var(--brand-surface-2)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span className="fh-badge" style={{ fontSize: '10px' }}>{suggestion.title}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {generatorResult.detectedGoal === 'reserve' ? 'Foco em reserva' : generatorResult.detectedGoal === 'clear_doubt' ? 'Foco em duvida' : 'Foco em retomada'}
                                            </span>
                                        </div>
                                        <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={() => copyText(suggestion.message)}>
                                            <Copy size={12} /> Copiar
                                        </button>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                                        {suggestion.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {assistantResult && (
                    <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span className="fh-badge" style={{ fontSize: '10px' }}>Acao: {assistantResult.action}</span>
                                <span className="fh-badge" style={{ fontSize: '10px' }}>Intencao: {assistantResult.intent}</span>
                                {assistantResult.availability.checked && (
                                    <span className="fh-badge" style={{ fontSize: '10px' }}>
                                        {assistantResult.availability.isAvailable ? 'Disponibilidade positiva' : 'Disponibilidade negativa'}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                                {assistantResult.message}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={() => copyText(assistantResult.message)}>
                                    <Copy size={12} /> Copiar resposta
                                </button>
                                {assistantResult.reservationLink && (
                                    <button className="fh-btn fh-btn-outline fh-btn-sm" onClick={() => copyText(assistantResult.reservationLink || '')}>
                                        <Copy size={12} /> Copiar link
                                    </button>
                                )}
                            </div>
                            {(assistantResult.missingFields.length > 0 || assistantResult.availability.reason) && (
                                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {assistantResult.missingFields.length > 0 && (
                                        <div>Faltando para resposta mais precisa: {assistantResult.missingFields.join(', ')}</div>
                                    )}
                                    {assistantResult.availability.reason && (
                                        <div>{assistantResult.availability.reason}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Nova regra de follow-up</h3>
                    <div className="admin-form-grid-2" style={{ marginBottom: '14px' }}>
                        <div>
                            <label className="fh-label">Nome da regra</label>
                            <input className="fh-input" placeholder="Ex: Retomada com contexto" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
                        </div>
                        <div>
                            <label className="fh-label">Canal</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {CHANNELS.map(channel => (
                                    <button
                                        key={channel.value}
                                        type="button"
                                        onClick={() => setForm(current => ({ ...current, channel: channel.value }))}
                                        style={{
                                            flex: 1,
                                            padding: '10px 6px',
                                            border: `1px solid ${form.channel === channel.value ? 'var(--brand-gold)' : 'var(--brand-border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: form.channel === channel.value ? 'rgba(201,168,76,0.1)' : 'var(--brand-surface-2)',
                                            color: form.channel === channel.value ? 'var(--brand-gold)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {channel.icon}
                                        {channel.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="fh-label">Gatilho</label>
                            <select className="fh-input" value={form.trigger_event} onChange={event => setForm(current => ({ ...current, trigger_event: event.target.value }))}>
                                {TRIGGER_EVENTS.map(trigger => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="fh-label">
                                {form.trigger_event === 'before_reservation' ? 'Minutos antes' : 'Minutos apos'}
                            </label>
                            <input
                                className="fh-input"
                                type="number"
                                min={0}
                                placeholder="0 = imediato"
                                value={form.offset_minutes}
                                onChange={event => setForm(current => ({ ...current, offset_minutes: Number(event.target.value) }))}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {form.trigger_event === 'before_reservation'
                                    ? `Enviar ${form.offset_minutes / 60}h antes da reserva`
                                    : `Enviar ${form.offset_minutes}min apos o gatilho`}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label className="fh-label">Mensagem</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {VARIABLES.map(variable => (
                                <button
                                    key={variable}
                                    type="button"
                                    onClick={() => insertVariable(variable)}
                                    style={{
                                        padding: '3px 8px',
                                        background: 'var(--brand-surface-3)',
                                        border: '1px solid var(--brand-border)',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        color: 'var(--brand-gold)',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {variable}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="fh-input"
                            rows={4}
                            placeholder="Texto da mensagem com variaveis..."
                            value={form.message_template}
                            onChange={event => setForm(current => ({ ...current, message_template: event.target.value }))}
                            style={{ resize: 'vertical' }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Para follow-up comercial, prefira usar {'{{ultima_duvida}}'}, {'{{resumo_conversa}}'} e {'{{link_reserva}}'}.
                        </p>
                    </div>
                    <div className="admin-form-actions">
                        <button className="fh-btn fh-btn-ghost" onClick={() => { setShowForm(false); setForm(DEFAULT_RULE_FORM) }}>Cancelar</button>
                        <button className="fh-btn fh-btn-primary" onClick={save} disabled={saving || !form.name}>
                            {saving ? <><Loader2 size={14} />Salvando...</> : 'Salvar regra'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : rules.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhuma regra de follow-up ainda.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Use a sequencia recomendada ou crie suas proprias regras contextuais.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rules.map((rule) => (
                        <div key={rule.id} className="fh-card admin-item-row" style={{
                            gap: '14px',
                            padding: '16px 20px',
                            opacity: rule.is_active ? 1 : 0.6,
                            borderColor: rule.is_active ? 'var(--brand-border)' : 'transparent',
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                flexShrink: 0,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--brand-surface-2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {channelIcon(rule.channel)}
                            </div>
                            <div className="admin-item-main">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{rule.name}</span>
                                    {!rule.is_active && <span className="fh-badge" style={{ background: 'rgba(100,100,100,0.12)', color: 'var(--text-muted)', fontSize: '10px' }}>Inativo</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <span>{TRIGGER_EVENTS.find(trigger => trigger.value === rule.trigger_event)?.label || rule.trigger_event}</span>
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
                            <div className="admin-item-actions" style={{ alignItems: 'flex-start', flexShrink: 0 }}>
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
