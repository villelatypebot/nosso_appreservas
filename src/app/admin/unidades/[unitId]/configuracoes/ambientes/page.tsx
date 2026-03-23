'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Loader2, Building2, Save, AlertCircle, CheckCircle, Edit3, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Environment {
    id: string
    unit_id: string
    name: string
    description: string | null
    max_capacity: number
    is_active: boolean
    created_at: string
}

export default function AmbientesPage() {
    const params = useParams()
    const unitId = params.unitId as string
    const supabase = createClient()

    const [envs, setEnvs] = useState<Environment[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [form, setForm] = useState({
        name: '',
        description: '',
        max_capacity: 30,
    })

    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        max_capacity: 30,
    })

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('environments')
            .select('*')
            .eq('unit_id', unitId)
            .order('name')
        setEnvs(data || [])
        setLoading(false)
    }, [unitId])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        setMessage(null)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('environments') as any).insert({
            unit_id: unitId,
            name: form.name.trim(),
            description: form.description.trim() || null,
            max_capacity: form.max_capacity,
            is_active: true,
        })

        if (error) {
            setMessage({ type: 'error', text: 'Erro: ' + error.message })
        } else {
            setMessage({ type: 'success', text: `Ambiente "${form.name}" criado!` })
            setShowForm(false)
            setForm({ name: '', description: '', max_capacity: 30 })
            await load()
            setTimeout(() => setMessage(null), 4000)
        }
        setSaving(false)
    }

    const startEdit = (env: Environment) => {
        setEditingId(env.id)
        setEditForm({
            name: env.name,
            description: env.description || '',
            max_capacity: env.max_capacity,
        })
    }

    const handleUpdate = async (id: string) => {
        setSaving(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('environments') as any)
            .update({
                name: editForm.name.trim(),
                description: editForm.description.trim() || null,
                max_capacity: editForm.max_capacity,
            })
            .eq('id', id)

        if (error) {
            setMessage({ type: 'error', text: 'Erro: ' + error.message })
        } else {
            setMessage({ type: 'success', text: 'Ambiente atualizado!' })
            setEditingId(null)
            await load()
            setTimeout(() => setMessage(null), 3000)
        }
        setSaving(false)
    }

    const toggleActive = async (env: Environment) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('environments') as any).update({ is_active: !env.is_active }).eq('id', env.id)
        await load()
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Excluir o ambiente "${name}"? Reservas existentes não serão afetadas.`)) return
        await supabase.from('environments').delete().eq('id', id)
        setMessage({ type: 'success', text: 'Ambiente removido.' })
        await load()
        setTimeout(() => setMessage(null), 3000)
    }

    const totalCapacity = envs.filter(e => e.is_active).reduce((sum, e) => sum + e.max_capacity, 0)

    return (
        <div className="admin-page-shell narrow">
            <div className="admin-page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>
                    <Building2 size={22} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    Ambientes
                </h1>
                <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => setShowForm(s => !s)}>
                    <Plus size={14} /> Novo Ambiente
                </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                Configure os ambientes e a capacidade máxima de cada um. Ex: Varanda, Salão Interno, Área VIP.
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

            {/* Capacity Summary */}
            {envs.length > 0 && (
                <div className="admin-summary-grid">
                    <div className="fh-card" style={{ flex: 1, textAlign: 'center', padding: '16px' }}>
                        <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brand-orange)' }}>{envs.filter(e => e.is_active).length}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ambientes Ativos</p>
                    </div>
                    <div className="fh-card" style={{ flex: 1, textAlign: 'center', padding: '16px' }}>
                        <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brand-gold)' }}>{totalCapacity}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capacidade Total</p>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="fh-card animate-fade-in" style={{ marginBottom: '24px', borderColor: 'var(--brand-gold-dark)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Novo Ambiente</h3>
                    <div className="admin-form-grid-2" style={{ marginBottom: '14px' }}>
                        <div>
                            <label className="fh-label">Nome do Ambiente *</label>
                            <input
                                className="fh-input"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ex: Varanda, Salão Interno, Área VIP"
                            />
                        </div>
                        <div>
                            <label className="fh-label">Capacidade Máxima (pessoas)</label>
                            <input
                                className="fh-input"
                                type="number"
                                min={1}
                                value={form.max_capacity}
                                onChange={e => setForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="fh-label">Descrição (opcional)</label>
                        <input
                            className="fh-input"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Ex: Área aberta com vista para o jardim, 10 mesas"
                        />
                    </div>
                    <div className="admin-form-actions">
                        <button className="fh-btn fh-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        <button className="fh-btn fh-btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()}>
                            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Save size={14} /> Criar Ambiente</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Environments List */}
            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                </div>
            ) : envs.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Building2 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhum ambiente configurado.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>
                        Adicione ambientes como &quot;Varanda&quot;, &quot;Salão Interno&quot;, etc.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {envs.map(env => (
                        <div key={env.id} className="fh-card" style={{
                            padding: '16px 20px',
                            opacity: env.is_active ? 1 : 0.5,
                            borderColor: editingId === env.id ? 'var(--brand-gold-dark)' : undefined,
                        }}>
                            {editingId === env.id ? (
                                /* Edit mode */
                                <div>
                                    <div className="admin-form-grid-2" style={{ marginBottom: '14px' }}>
                                        <div>
                                            <label className="fh-label">Nome</label>
                                            <input
                                                className="fh-input"
                                                value={editForm.name}
                                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="fh-label">Capacidade Máxima</label>
                                            <input
                                                className="fh-input"
                                                type="number"
                                                min={1}
                                                value={editForm.max_capacity}
                                                onChange={e => setEditForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label className="fh-label">Descrição</label>
                                        <input
                                            className="fh-input"
                                            value={editForm.description}
                                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                        />
                                    </div>
                                    <div className="admin-form-actions">
                                        <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={() => setEditingId(null)}>
                                            <X size={12} /> Cancelar
                                        </button>
                                        <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => handleUpdate(env.id)} disabled={saving}>
                                            <Save size={12} /> Salvar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View mode */
                                <div className="admin-item-row">
                                    <div className="admin-item-main" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '12px',
                                            background: env.is_active ? 'rgba(244,121,32,0.1)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${env.is_active ? 'rgba(244,121,32,0.2)' : 'rgba(255,255,255,0.1)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Building2 size={18} color={env.is_active ? 'var(--brand-orange)' : 'var(--text-muted)'} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{env.name}</p>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                <span>👥 Até {env.max_capacity} pessoas</span>
                                                {env.description && <span>• {env.description}</span>}
                                                {!env.is_active && <span style={{ color: 'var(--color-danger)' }}>• Desativado</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-item-actions">
                                        <button
                                            className={`fh-btn fh-btn-sm ${env.is_active ? 'fh-btn-ghost' : 'fh-btn-outline'}`}
                                            onClick={() => toggleActive(env)}
                                        >
                                            {env.is_active ? 'Desativar' : 'Ativar'}
                                        </button>
                                        <button className="fh-btn fh-btn-sm fh-btn-ghost" onClick={() => startEdit(env)}>
                                            <Edit3 size={12} />
                                        </button>
                                        <button className="fh-btn fh-btn-sm fh-btn-danger" onClick={() => handleDelete(env.id, env.name)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
