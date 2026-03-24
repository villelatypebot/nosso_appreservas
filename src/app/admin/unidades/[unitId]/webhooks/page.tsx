'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, ExternalLink, Activity, AlertCircle, CheckCircle, Clock, Loader2, Copy, Eye, EyeOff } from 'lucide-react'
import type { Webhook, WebhookLog } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

const ALL_EVENTS = [
    { value: 'reservation.confirmed', label: '✓ Reserva Confirmada' },
    { value: 'reservation.cancelled', label: '✗ Reserva Cancelada' },
    { value: 'reservation.no_show', label: '⚠ No-Show Registrado' },
    { value: 'reservation.seated', label: '🪑 Cliente Sentado' },
    { value: 'reservation.pending', label: '⏳ Reserva Criada (Pendente)' },
]

function WebhookStatusDot({ status }: { status: number | null }) {
    if (!status) return <span className="webhook-status idle" />
    if (status >= 200 && status < 300) return <span className="webhook-status ok" />
    return <span className="webhook-status error" />
}

export default function WebhooksPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const [supabase] = useState(() => createClient())

    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [logs, setLogs] = useState<(WebhookLog & { webhooks?: { name: string } })[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [form, setForm] = useState({
        name: '',
        url: '',
        secret: '',
        events: [] as string[],
    })

    const load = useCallback(async () => {
        setLoading(true)
        const [whRes, logRes] = await Promise.all([
            supabase.from('webhooks').select('*').eq('unit_id', unitId).order('created_at', { ascending: false }),
            supabase
                .from('webhook_logs')
                .select('*, webhooks!inner(name, unit_id)')
                .eq('webhooks.unit_id', unitId)
                .order('triggered_at', { ascending: false })
                .limit(20),
        ])
        setWebhooks(whRes.data || [])
        setLogs(logRes.data as (WebhookLog & { webhooks?: { name: string } })[] || [])
        setLoading(false)
    }, [supabase, unitId])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [load])

    const toggleEvent = (ev: string) => {
        setForm(f => ({
            ...f,
            events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
        }))
    }

    const save = async () => {
        if (!form.name || !form.url || form.events.length === 0) return
        setSaving(true)
        await supabase.from('webhooks').insert({
            unit_id: unitId,
            name: form.name,
            url: form.url,
            secret: form.secret || null,
            events: form.events,
            is_active: true,
        })
        setForm({ name: '', url: '', secret: '', events: [] })
        setShowForm(false)
        await load()
        setSaving(false)
    }

    const deleteWebhook = async (id: string) => {
        if (!confirm('Excluir este webhook?')) return
        await supabase.from('webhooks').delete().eq('id', id)
        await load()
    }

    const testWebhook = async (webhook: Webhook) => {
        setTesting(webhook.id)
        await fetch('/api/webhooks/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhookId: webhook.id }),
        })
        await load()
        setTesting(null)
    }

    const toggleActive = async (webhook: Webhook) => {
        await supabase.from('webhooks').update({ is_active: !webhook.is_active }).eq('id', webhook.id)
        await load()
    }

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url)
    }

    return (
        <div className="admin-page-shell medium">
            {/* Header */}
            <div className="admin-page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px' }}>Webhooks</h1>
                <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(s => !s)}>
                    <Plus size={14} /> Novo webhook
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Receba notificações HTTP quando eventos de reserva ocorrerem nesta unidade.
            </p>

            {/* Create Form */}
            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
                        Novo webhook
                    </h3>
                    <div className="admin-form-grid-2" style={{ marginBottom: '14px' }}>
                        <div>
                            <label className="fh-label">Nome</label>
                            <input className="fh-input" placeholder="Ex: CRM Principal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="fh-label">URL do endpoint</label>
                            <input className="fh-input" placeholder="https://seu-sistema.com/webhook" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} type="url" />
                        </div>
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                        <label className="fh-label">Secret (opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="fh-input"
                                type={showSecret ? 'text' : 'password'}
                                placeholder="Chave secreta para validar assinatura HMAC-SHA256"
                                value={form.secret}
                                onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                                style={{ paddingRight: '44px' }}
                            />
                            <button type="button" onClick={() => setShowSecret(s => !s)} style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                            }}>
                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Será enviado no header <code style={{ background: 'var(--brand-surface-3)', padding: '1px 5px', borderRadius: '3px' }}>X-FullHouse-Signature</code> como HMAC-SHA256
                        </p>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="fh-label">Eventos para escutar</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {ALL_EVENTS.map(ev => (
                                <button
                                    key={ev.value}
                                    type="button"
                                    onClick={() => toggleEvent(ev.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${form.events.includes(ev.value) ? 'var(--brand-gold)' : 'var(--brand-border)'}`,
                                        background: form.events.includes(ev.value) ? 'rgba(201,168,76,0.12)' : 'var(--brand-surface-2)',
                                        color: form.events.includes(ev.value) ? 'var(--brand-gold)' : 'var(--text-muted)',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {ev.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="admin-form-actions">
                        <button className="fh-btn fh-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        <button
                            className="fh-btn fh-btn-primary"
                            onClick={save}
                            disabled={saving || !form.name || !form.url || form.events.length === 0}
                        >
                            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : 'Salvar webhook'}
                        </button>
                    </div>
                </div>
            )}

            {/* Webhooks List */}
            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : webhooks.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhum webhook configurado ainda.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Clique em &quot;Novo webhook&quot; para começar.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {webhooks.map((wh) => (
                        <div key={wh.id} className="webhook-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <WebhookStatusDot status={wh.last_status} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{wh.name}</span>
                                        {!wh.is_active && (
                                            <span className="fh-badge" style={{ background: 'rgba(100,100,100,0.12)', color: 'var(--text-muted)', fontSize: '10px' }}>Inativo</span>
                                        )}
                                        {wh.last_status && (
                                            <span className="fh-badge" style={{
                                                background: wh.last_status >= 200 && wh.last_status < 300 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                color: wh.last_status >= 200 && wh.last_status < 300 ? 'var(--color-success)' : 'var(--color-danger)',
                                                fontSize: '10px',
                                            }}>
                                                {wh.last_status}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                            {wh.url}
                                        </span>
                                        <button type="button" onClick={() => copyUrl(wh.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', display: 'flex', alignItems: 'center' }}>
                                            <Copy size={11} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {wh.events.map(ev => (
                                            <span key={ev} style={{
                                                fontSize: '10px', padding: '2px 8px',
                                                background: 'var(--brand-surface-3)',
                                                borderRadius: '99px',
                                                color: 'var(--text-muted)',
                                            }}>{ev}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button
                                    className="fh-btn fh-btn-sm fh-btn-ghost"
                                    onClick={() => testWebhook(wh)}
                                    disabled={testing === wh.id}
                                    title="Testar webhook"
                                >
                                    {testing === wh.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ExternalLink size={12} />}
                                    Testar
                                </button>
                                <button
                                    className={`fh-btn fh-btn-sm ${wh.is_active ? 'fh-btn-ghost' : 'fh-btn-outline'}`}
                                    onClick={() => toggleActive(wh)}
                                    title={wh.is_active ? 'Desativar' : 'Ativar'}
                                >
                                    {wh.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                </button>
                                <button className="fh-btn fh-btn-sm fh-btn-danger" onClick={() => deleteWebhook(wh.id)} title="Excluir">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Logs */}
            {logs.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="var(--brand-gold)" />
                        Histórico de disparos
                    </h2>
                    <div className="fh-card admin-table-shell" style={{ overflow: 'hidden' }}>
                        <table className="fh-table admin-table-desktop">
                            <thead>
                                <tr>
                                    <th>Webhook</th>
                                    <th>Evento</th>
                                    <th>Status</th>
                                    <th>Data/hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: '12px' }}>{log.webhooks?.name || log.webhook_id.substring(0, 8) + '…'}</td>
                                        <td>
                                            <span style={{
                                                fontSize: '11px', fontFamily: 'monospace',
                                                background: 'var(--brand-surface-3)',
                                                padding: '2px 6px', borderRadius: '4px',
                                                color: 'var(--brand-gold)',
                                            }}>{log.event}</span>
                                        </td>
                                        <td>
                                            <span className="fh-badge" style={{
                                                background: log.response_status && log.response_status >= 200 && log.response_status < 300 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                color: log.response_status && log.response_status >= 200 && log.response_status < 300 ? 'var(--color-success)' : 'var(--color-danger)',
                                            }}>
                                                {log.response_status || 'ERR'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {new Date(log.triggered_at).toLocaleString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="admin-table-mobile">
                            {logs.map((log) => (
                                <div key={log.id} className="admin-mobile-card">
                                    <div className="admin-mobile-card-head">
                                        <div>
                                            <div className="admin-mobile-card-title">{log.webhooks?.name || log.webhook_id.substring(0, 8) + '…'}</div>
                                            <div className="admin-mobile-card-subtitle">{new Date(log.triggered_at).toLocaleString('pt-BR')}</div>
                                        </div>
                                        <span className="fh-badge" style={{
                                            background: log.response_status && log.response_status >= 200 && log.response_status < 300 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                            color: log.response_status && log.response_status >= 200 && log.response_status < 300 ? 'var(--color-success)' : 'var(--color-danger)',
                                        }}>
                                            {log.response_status || 'ERR'}
                                        </span>
                                    </div>
                                    <div className="admin-mobile-field">
                                        <span className="admin-mobile-label">Evento</span>
                                        <div className="admin-mobile-value">
                                            <span style={{
                                                fontSize: '11px', fontFamily: 'monospace',
                                                background: 'var(--brand-surface-3)',
                                                padding: '2px 6px', borderRadius: '4px',
                                                color: 'var(--brand-gold)',
                                            }}>{log.event}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
