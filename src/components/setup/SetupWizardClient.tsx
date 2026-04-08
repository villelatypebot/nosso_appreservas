'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface SetupWizardClientProps {
    canRunSetup: boolean
}

export default function SetupWizardClient({ canRunSetup }: SetupWizardClientProps) {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
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
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        establishmentName: '',
        establishmentSlug: '',
        establishmentAddress: '',
        establishmentPhone: '',
    })

    const updateField = (field: keyof typeof form, value: string) => {
        setForm((current) => {
            if (field === 'brandName' && !current.shortName) {
                return { ...current, brandName: value, shortName: value }
            }

            if (field === 'establishmentName' && !current.establishmentSlug) {
                return {
                    ...current,
                    establishmentName: value,
                    establishmentSlug: value
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-'),
                }
            }

            return { ...current, [field]: value }
        })
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        const response = await fetch('/api/setup/bootstrap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })

        const json = await response.json()

        if (!response.ok) {
            setError(json.error || 'Não foi possível concluir o setup.')
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
    }

    if (!canRunSetup) {
        return (
            <div className="fh-card" style={{ maxWidth: '780px', margin: '0 auto', padding: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>Setup já concluído</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
                    Este projeto já possui um administrador cadastrado. Entre pelo painel administrativo e continue a configuração por lá.
                </p>
                <a className="fh-btn fh-btn-primary" href="/admin/login" style={{ marginTop: '20px', display: 'inline-flex' }}>
                    Ir para o login
                </a>
            </div>
        )
    }

    if (success) {
        return (
            <div className="fh-card" style={{ maxWidth: '780px', margin: '0 auto', padding: '32px', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>Setup concluído</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>
                    Sua marca, o primeiro administrador e o primeiro estabelecimento já foram criados.
                    O próximo passo é entrar no painel e configurar horários, regras e ambientes da unidade.
                </p>
                <a className="fh-btn fh-btn-primary" href="/admin/login">
                    Abrir painel administrativo
                </a>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="fh-card" style={{ maxWidth: '960px', margin: '0 auto', padding: '32px' }}>
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Setup inicial do projeto</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
                    Preencha a marca, o administrador principal e o primeiro estabelecimento. Depois disso, o cliente já consegue seguir pelo painel sozinho.
                </p>
            </div>

            {error && (
                <div style={{
                    background: 'var(--color-danger-bg)',
                    border: '1px solid rgba(220,38,38,.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: 'var(--color-danger)',
                    marginBottom: '18px',
                }}>
                    {error}
                </div>
            )}

            <div className="admin-form-grid-2" style={{ marginBottom: '24px' }}>
                <div>
                    <label className="fh-label">Nome da marca *</label>
                    <input className="fh-input" value={form.brandName} onChange={e => updateField('brandName', e.target.value)} placeholder="Ex: Churrascaria do Lago" required />
                </div>
                <div>
                    <label className="fh-label">Nome curto da marca *</label>
                    <input className="fh-input" value={form.shortName} onChange={e => updateField('shortName', e.target.value)} placeholder="Ex: Lago" required />
                </div>
                <div>
                    <label className="fh-label">Tagline</label>
                    <input className="fh-input" value={form.tagline} onChange={e => updateField('tagline', e.target.value)} placeholder="Ex: Reservas sem atrito para o seu negócio" />
                </div>
                <div>
                    <label className="fh-label">Prefixo do código da reserva *</label>
                    <input className="fh-input" value={form.reservationCodePrefix} onChange={e => updateField('reservationCodePrefix', e.target.value.toUpperCase())} placeholder="Ex: LAGO" maxLength={4} required />
                </div>
                <div>
                    <label className="fh-label">Telefone de suporte</label>
                    <input className="fh-input" value={form.supportPhone} onChange={e => updateField('supportPhone', e.target.value)} placeholder="Ex: (21) 99999-9999" />
                </div>
                <div>
                    <label className="fh-label">E-mail de suporte</label>
                    <input className="fh-input" type="email" value={form.supportEmail} onChange={e => updateField('supportEmail', e.target.value)} placeholder="Ex: contato@empresa.com.br" />
                </div>
                <div>
                    <label className="fh-label">WhatsApp principal</label>
                    <input className="fh-input" value={form.whatsappPhone} onChange={e => updateField('whatsappPhone', e.target.value)} placeholder="Ex: 21999999999" />
                </div>
                <div>
                    <label className="fh-label">URL da logo</label>
                    <input className="fh-input" value={form.logoUrl} onChange={e => updateField('logoUrl', e.target.value)} placeholder="https://..." />
                </div>
                <div>
                    <label className="fh-label">Cor principal *</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="color"
                            value={form.primaryColor}
                            onChange={e => updateField('primaryColor', e.target.value)}
                            aria-label="Cor principal"
                            style={{ width: '52px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent' }}
                        />
                        <input className="fh-input" value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} placeholder="#ff8a3d" required />
                    </div>
                </div>
                <div>
                    <label className="fh-label">Cor secundária *</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="color"
                            value={form.secondaryColor}
                            onChange={e => updateField('secondaryColor', e.target.value)}
                            aria-label="Cor secundária"
                            style={{ width: '52px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent' }}
                        />
                        <input className="fh-input" value={form.secondaryColor} onChange={e => updateField('secondaryColor', e.target.value)} placeholder="#d96b0d" required />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label className="fh-label">Descrição pública</label>
                <textarea className="fh-input" rows={3} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Texto que será usado nas páginas públicas do projeto." />
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '24px' }}>
                <div>
                    <label className="fh-label">Administrador principal *</label>
                    <input className="fh-input" value={form.adminName} onChange={e => updateField('adminName', e.target.value)} placeholder="Nome do responsável" required />
                </div>
                <div>
                    <label className="fh-label">E-mail do administrador *</label>
                    <input className="fh-input" type="email" value={form.adminEmail} onChange={e => updateField('adminEmail', e.target.value)} placeholder="admin@empresa.com.br" required />
                </div>
                <div>
                    <label className="fh-label">Senha do administrador *</label>
                    <input className="fh-input" type="password" value={form.adminPassword} onChange={e => updateField('adminPassword', e.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" required />
                </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '24px' }}>
                <div>
                    <label className="fh-label">Primeiro estabelecimento *</label>
                    <input className="fh-input" value={form.establishmentName} onChange={e => updateField('establishmentName', e.target.value)} placeholder="Ex: Unidade Centro" required />
                </div>
                <div>
                    <label className="fh-label">Slug do estabelecimento *</label>
                    <input className="fh-input" value={form.establishmentSlug} onChange={e => updateField('establishmentSlug', e.target.value)} placeholder="Ex: unidade-centro" required />
                </div>
                <div>
                    <label className="fh-label">Telefone do estabelecimento</label>
                    <input className="fh-input" value={form.establishmentPhone} onChange={e => updateField('establishmentPhone', e.target.value)} placeholder="Ex: (21) 99999-0000" />
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label className="fh-label">Endereço do estabelecimento</label>
                <input className="fh-input" value={form.establishmentAddress} onChange={e => updateField('establishmentAddress', e.target.value)} placeholder="Ex: Rua Exemplo, 123 - Centro" />
            </div>

            <div className="admin-info-box" style={{ marginBottom: '24px' }}>
                Depois do setup, configure em cada estabelecimento:
                horários, regras de reserva, ambientes, bloqueios, webhooks, notificações push e follow-ups.
            </div>

            <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                <button className="fh-btn fh-btn-primary" type="submit" disabled={loading}>
                    {loading ? <><Loader2 size={14} className="animate-spin" /> Concluindo setup...</> : 'Concluir setup inicial'}
                </button>
            </div>
        </form>
    )
}
