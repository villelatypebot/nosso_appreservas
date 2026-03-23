'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
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
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        width: '72px', height: '72px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #FF9A4D, #C45E0A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '32px',
                        fontWeight: 900, color: '#fff',
                        boxShadow: '0 8px 32px rgba(244,121,32,.4)',
                        letterSpacing: '-0.02em',
                    }}>FH</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A1008', marginBottom: '6px' }}>
                        Full House Admin
                    </h1>
                    <p style={{ fontSize: '13px', color: '#A07850' }}>
                        Projeto em teste - acesso livre ao painel administrativo
                    </p>
                </div>

                {/* Card */}
                <div className="fh-card" style={{ padding: '32px', boxShadow: '0 8px 40px rgba(244,121,32,.12)' }}>
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
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        marginBottom: '18px',
                    }}>
                        Se quiser, o login por e-mail e senha continua disponivel abaixo.
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label className="fh-label">E-mail</label>
                            <input
                                className="fh-input"
                                type="email"
                                placeholder="admin@fullhouse.com.br"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="fh-label">Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="fh-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '44px' }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(s => !s)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
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
                </div>
            </div>
        </main>
    )
}
