'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BrandMark from '@/components/branding/BrandMark'
import type { BrandSettings } from '@/lib/brand'
import { runtimeFlags } from '@/lib/brand'

interface AdminLoginClientProps {
    brand: BrandSettings
}

export default function AdminLoginClient({ brand }: AdminLoginClientProps) {
    const router = useRouter()
    const [freeAccess, setFreeAccess] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!freeAccess) return
        router.replace('/admin/dashboard')
    }, [freeAccess, router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const supabase = createClient()
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) {
            setError('E-mail ou senha inválidos.')
            setLoading(false)
        } else {
            router.push('/admin/dashboard')
        }
    }

    const handleFreeAccess = () => {
        setError('')
        setFreeAccess(true)
    }

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #FEF0E6 0%, #FFF7F2 60%, #FEE8D0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <BrandMark
                            size={72}
                            brandName={brand.brandName}
                            shortName={brand.shortName}
                            logoUrl={brand.logoUrl}
                            primaryColor={brand.primaryColor}
                            secondaryColor={brand.secondaryColor}
                            rounded={20}
                        />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A1008', marginBottom: '6px' }}>
                        {brand.shortName} Admin
                    </h1>
                    <p style={{ fontSize: '13px', color: '#A07850' }}>
                        {runtimeFlags.adminFreeAccess
                            ? 'Modo de teste ativo - acesso livre ao painel administrativo'
                            : 'Entre com o usuário administrador da sua operação'}
                    </p>
                </div>

                <div
                    className="fh-card"
                    style={{
                        padding: '32px',
                        boxShadow: '0 8px 40px rgba(244,121,32,.12)',
                        background: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(244,121,32,0.12)',
                        color: '#1A1008',
                    }}
                >
                    {runtimeFlags.adminFreeAccess && (
                        <>
                            <button
                                className="fh-btn fh-btn-primary fh-btn-lg fh-btn-full"
                                type="button"
                                onClick={handleFreeAccess}
                                disabled={freeAccess}
                                style={{ marginBottom: '18px' }}
                            >
                                {freeAccess ? 'Abrindo painel...' : 'Entrar sem login'}
                            </button>

                            <div style={{
                                fontSize: '12px',
                                color: '#8B6B4A',
                                textAlign: 'center',
                                marginBottom: '18px',
                            }}>
                                Se quiser, o login por e-mail e senha continua disponível abaixo.
                            </div>
                        </>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label className="fh-label" style={{ color: '#A07850' }}>E-mail</label>
                            <input
                                className="fh-input"
                                type="email"
                                placeholder="admin@empresa.com.br"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                style={{
                                    background: 'rgba(255,255,255,0.92)',
                                    border: '1px solid rgba(196,94,10,0.18)',
                                    color: '#1A1008',
                                }}
                            />
                        </div>

                        <div>
                            <label className="fh-label" style={{ color: '#A07850' }}>Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="fh-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        paddingRight: '44px',
                                        background: 'rgba(255,255,255,0.92)',
                                        border: '1px solid rgba(196,94,10,0.18)',
                                        color: '#1A1008',
                                    }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(s => !s)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#A07850',
                                        display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                background: 'var(--color-danger-bg)',
                                border: '1px solid rgba(220,38,38,.2)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px',
                                fontSize: '13px',
                                color: 'var(--color-danger)',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            className="fh-btn fh-btn-primary fh-btn-lg fh-btn-full"
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: '4px' }}
                        >
                            {loading ? (
                                <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                            ) : (
                                'Entrar no painel'
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '18px', textAlign: 'center' }}>
                        <a href="/setup" style={{ fontSize: '12px', color: '#8B6B4A' }}>
                            Primeira instalação? Abra o setup inicial
                        </a>
                    </div>
                </div>
            </div>
        </main>
    )
}
