'use client'

import { useEffect, useState } from 'react'
import { Loader2, Palette, Save } from 'lucide-react'

interface BrandSettingsFormState {
    brandName: string
    shortName: string
    tagline: string
    description: string
    supportPhone: string
    supportEmail: string
    whatsappPhone: string
    logoUrl: string
    primaryColor: string
    secondaryColor: string
    reservationCodePrefix: string
}

const DEFAULT_FORM: BrandSettingsFormState = {
    brandName: '',
    shortName: '',
    tagline: '',
    description: '',
    supportPhone: '',
    supportEmail: '',
    whatsappPhone: '',
    logoUrl: '',
    primaryColor: '#ff8a3d',
    secondaryColor: '#d96b0d',
    reservationCodePrefix: 'RS',
}

export default function PersonalizacaoPage() {
    const [form, setForm] = useState<BrandSettingsFormState>(DEFAULT_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        let active = true

        async function load() {
            try {
                const response = await fetch('/api/admin/business-settings')
                const json = await response.json()

                if (!response.ok) {
                    throw new Error(json.error || 'Não foi possível carregar a personalização.')
                }

                if (!active) return

                setForm({
                    brandName: json.settings?.brandName || '',
                    shortName: json.settings?.shortName || '',
                    tagline: json.settings?.tagline || '',
                    description: json.settings?.description || '',
                    supportPhone: json.settings?.supportPhone || '',
                    supportEmail: json.settings?.supportEmail || '',
                    whatsappPhone: json.settings?.whatsappPhone || '',
                    logoUrl: json.settings?.logoUrl || '',
                    primaryColor: json.settings?.primaryColor || '#ff8a3d',
                    secondaryColor: json.settings?.secondaryColor || '#d96b0d',
                    reservationCodePrefix: json.settings?.reservationCodePrefix || 'RS',
                })
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Não foi possível carregar a personalização.')
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        load()
        return () => {
            active = false
        }
    }, [])

    const updateField = (field: keyof BrandSettingsFormState, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'brandName' && !current.shortName ? { shortName: value } : {}),
        }))
        setSuccess('')
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const response = await fetch('/api/admin/business-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const json = await response.json()

            if (!response.ok) {
                throw new Error(json.error || 'Não foi possível salvar a personalização.')
            }

            setForm({
                brandName: json.settings?.brandName || form.brandName,
                shortName: json.settings?.shortName || form.shortName,
                tagline: json.settings?.tagline || '',
                description: json.settings?.description || '',
                supportPhone: json.settings?.supportPhone || '',
                supportEmail: json.settings?.supportEmail || '',
                whatsappPhone: json.settings?.whatsappPhone || '',
                logoUrl: json.settings?.logoUrl || '',
                primaryColor: json.settings?.primaryColor || form.primaryColor,
                secondaryColor: json.settings?.secondaryColor || form.secondaryColor,
                reservationCodePrefix: json.settings?.reservationCodePrefix || form.reservationCodePrefix,
            })
            setSuccess('Personalização salva com sucesso. O app já passa a refletir a nova marca.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível salvar a personalização.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="admin-page-shell">
                <div className="fh-card" style={{ padding: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={18} className="animate-spin" />
                    Carregando personalização...
                </div>
            </div>
        )
    }

    return (
        <div className="admin-page-shell">
            <div style={{ marginBottom: '28px' }}>
                <p className="admin-eyebrow">Whitelabel</p>
                <h1 className="admin-page-title">Personalização da marca</h1>
                <p className="admin-page-subtitle">
                    Ajuste nome, cores, logo, contatos e prefixo dos códigos da reserva sem mexer no código do projeto.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="fh-card" style={{ padding: '24px' }}>
                {error && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1px solid rgba(220, 38, 38, 0.25)',
                        background: 'rgba(220, 38, 38, 0.08)',
                        color: '#fca5a5',
                        fontSize: '14px',
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1px solid rgba(34, 197, 94, 0.22)',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#86efac',
                        fontSize: '14px',
                    }}>
                        {success}
                    </div>
                )}

                <div className="admin-form-grid-2" style={{ marginBottom: '20px' }}>
                    <div>
                        <label className="fh-label">Nome da marca *</label>
                        <input className="fh-input" value={form.brandName} onChange={(e) => updateField('brandName', e.target.value)} required />
                    </div>
                    <div>
                        <label className="fh-label">Nome curto *</label>
                        <input className="fh-input" value={form.shortName} onChange={(e) => updateField('shortName', e.target.value)} required />
                    </div>
                    <div>
                        <label className="fh-label">Tagline</label>
                        <input className="fh-input" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} />
                    </div>
                    <div>
                        <label className="fh-label">Prefixo do código *</label>
                        <input className="fh-input" value={form.reservationCodePrefix} onChange={(e) => updateField('reservationCodePrefix', e.target.value.toUpperCase())} maxLength={4} required />
                    </div>
                    <div>
                        <label className="fh-label">Telefone de suporte</label>
                        <input className="fh-input" value={form.supportPhone} onChange={(e) => updateField('supportPhone', e.target.value)} />
                    </div>
                    <div>
                        <label className="fh-label">E-mail de suporte</label>
                        <input className="fh-input" type="email" value={form.supportEmail} onChange={(e) => updateField('supportEmail', e.target.value)} />
                    </div>
                    <div>
                        <label className="fh-label">WhatsApp principal</label>
                        <input className="fh-input" value={form.whatsappPhone} onChange={(e) => updateField('whatsappPhone', e.target.value)} />
                    </div>
                    <div>
                        <label className="fh-label">URL da logo</label>
                        <input className="fh-input" value={form.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                        <label className="fh-label">Cor principal *</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="color"
                                value={form.primaryColor}
                                onChange={(e) => updateField('primaryColor', e.target.value)}
                                aria-label="Cor principal"
                                style={{ width: '52px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent' }}
                            />
                            <input className="fh-input" value={form.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="fh-label">Cor secundária *</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="color"
                                value={form.secondaryColor}
                                onChange={(e) => updateField('secondaryColor', e.target.value)}
                                aria-label="Cor secundária"
                                style={{ width: '52px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent' }}
                            />
                            <input className="fh-input" value={form.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} required />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label className="fh-label">Descrição pública</label>
                    <textarea
                        className="fh-input"
                        rows={4}
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Texto exibido na home pública e em metadados."
                    />
                </div>

                <div className="admin-info-box" style={{ marginBottom: '20px' }}>
                    <Palette size={16} />
                    O nome, a logo, o ícone PWA, o manifesto, o login do admin e os textos públicos passam a usar essa personalização automaticamente.
                </div>

                <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="fh-btn fh-btn-primary" type="submit" disabled={saving}>
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar personalização</>}
                    </button>
                </div>
            </form>
        </div>
    )
}
