'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, Edit2, Loader2, RefreshCw, Save, Settings2 } from 'lucide-react'

interface UnitItem {
    id: string
    name: string
    slug: string
    address: string | null
    phone: string | null
    image_url: string | null
    is_active: boolean
}

const EMPTY_FORM = {
    id: '',
    name: '',
    slug: '',
    address: '',
    phone: '',
    image_url: '',
}

export default function EstabelecimentosPage() {
    const [units, setUnits] = useState<UnitItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [form, setForm] = useState(EMPTY_FORM)

    const isEditing = Boolean(form.id)

    const load = useCallback(async () => {
        setLoading(true)
        const response = await fetch('/api/admin/units')
        const json = await response.json()
        setUnits(json.units || [])
        setLoading(false)
    }, [])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [load])

    const normalizedSlug = useMemo(() => (
        form.slug
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
    ), [form.slug])

    const handleSave = async () => {
        if (!form.name.trim() || !normalizedSlug) return

        setSaving(true)
        setMessage('')

        const response = await fetch('/api/admin/units', {
            method: isEditing ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                slug: normalizedSlug,
            }),
        })

        const json = await response.json()

        if (!response.ok) {
            setMessage(json.error || 'Não foi possível salvar o estabelecimento.')
            setSaving(false)
            return
        }

        setForm(EMPTY_FORM)
        setMessage(isEditing ? 'Estabelecimento atualizado.' : 'Estabelecimento criado. Agora configure horários, regras e ambientes.')
        await load()
        setSaving(false)
    }

    const handleEdit = (unit: UnitItem) => {
        setForm({
            id: unit.id,
            name: unit.name,
            slug: unit.slug,
            address: unit.address || '',
            phone: unit.phone || '',
            image_url: unit.image_url || '',
        })
    }

    const toggleActive = async (unit: UnitItem) => {
        await fetch('/api/admin/units', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: unit.id, is_active: !unit.is_active }),
        })
        await load()
    }

    return (
        <div className="admin-page-shell wide">
            <div className="admin-page-header">
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Estabelecimentos</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        Cadastre e gerencie as unidades que vão aparecer para reserva pública.
                    </p>
                </div>
                <div className="admin-header-actions">
                    <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={load}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {message && (
                <div className="admin-info-box" style={{ marginBottom: '16px' }}>
                    {message}
                </div>
            )}

            <div className="fh-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                        {isEditing ? 'Editar estabelecimento' : 'Novo estabelecimento'}
                    </h2>
                    {isEditing && (
                        <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={() => setForm(EMPTY_FORM)}>
                            Cancelar edição
                        </button>
                    )}
                </div>

                <div className="admin-form-grid-2" style={{ marginBottom: '18px' }}>
                    <div>
                        <label className="fh-label">Nome *</label>
                        <input className="fh-input" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder="Ex: Unidade Centro" />
                    </div>
                    <div>
                        <label className="fh-label">Slug *</label>
                        <input className="fh-input" value={form.slug} onChange={e => setForm(current => ({ ...current, slug: e.target.value }))} placeholder="ex: unidade-centro" />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>URL final: `/reservar/{normalizedSlug || 'slug-da-unidade'}`</p>
                    </div>
                    <div>
                        <label className="fh-label">Telefone</label>
                        <input className="fh-input" value={form.phone} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} placeholder="Ex: (21) 99999-0000" />
                    </div>
                    <div>
                        <label className="fh-label">URL da imagem/logo</label>
                        <input className="fh-input" value={form.image_url} onChange={e => setForm(current => ({ ...current, image_url: e.target.value }))} placeholder="https://..." />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label className="fh-label">Endereço</label>
                    <input className="fh-input" value={form.address} onChange={e => setForm(current => ({ ...current, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
                </div>

                <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="fh-btn fh-btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> {isEditing ? 'Atualizar estabelecimento' : 'Criar estabelecimento'}</>}
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} className="animate-spin" style={{ display: 'block', margin: '0 auto 12px' }} />
                    Carregando estabelecimentos...
                </div>
            ) : units.length === 0 ? (
                <div className="fh-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Building2 size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
                    Nenhum estabelecimento cadastrado ainda.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {units.map((unit) => (
                        <div key={unit.id} className="fh-card" style={{ padding: '20px' }}>
                            <div className="admin-item-row">
                                <div className="admin-item-main">
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{unit.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{unit.slug}</div>
                                    {unit.address && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{unit.address}</div>}
                                    {unit.phone && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{unit.phone}</div>}
                                </div>
                                <div className="admin-item-actions">
                                    <span className={`fh-badge ${unit.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                        {unit.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                    <button className="fh-btn fh-btn-sm fh-btn-outline" onClick={() => handleEdit(unit)}>
                                        <Edit2 size={12} /> Editar
                                    </button>
                                    <button className="fh-btn fh-btn-sm fh-btn-ghost" onClick={() => toggleActive(unit)}>
                                        {unit.is_active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <Link className="fh-btn fh-btn-sm fh-btn-primary" href={`/admin/unidades/${unit.id}/configuracoes/horarios`}>
                                        <Settings2 size={12} /> Configurar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
