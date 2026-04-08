'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    UserPlus, Shield, Eye, Trash2, Loader2, RefreshCw,
    Mail, Lock, User, CheckCircle, AlertCircle, X, Edit2, Save
} from 'lucide-react'

type AdminRole = 'admin' | 'manager' | 'operator'

interface AdminUser {
    id: string
    name: string
    role: AdminRole
    created_at: string
}

const ROLE_OPTIONS: Array<{
    value: AdminRole
    label: string
    description: string
}> = [
    { value: 'admin', label: '🔑 Admin', description: 'Acesso total' },
    { value: 'manager', label: '🛠️ Gerente', description: 'Opera reservas e configurações' },
    { value: 'operator', label: '👁️ Operador', description: 'Opera reservas no dia a dia' },
]

function getRolePresentation(role: AdminRole) {
    switch (role) {
        case 'admin':
            return { badgeClass: 'badge-confirmed', label: 'Admin', icon: <Shield size={11} />, gradient: 'linear-gradient(135deg, #F47920, #C45E0A)' }
        case 'manager':
            return { badgeClass: 'badge-pending', label: 'Gerente', icon: <User size={11} />, gradient: 'linear-gradient(135deg, #C9A84C, #9A7D2D)' }
        default:
            return { badgeClass: 'badge-seated', label: 'Operador', icon: <Eye size={11} />, gradient: 'linear-gradient(135deg, #5B8DEF, #3B6FCF)' }
    }
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formLoading, setFormLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editRole, setEditRole] = useState<string>('')
    const [editName, setEditName] = useState<string>('')

    // Form state
    const [formName, setFormName] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formPassword, setFormPassword] = useState('')
    const [formRole, setFormRole] = useState<AdminRole>('operator')

    // Messages
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/users')
            const json = await res.json()
            setUsers(json.users || [])
        } catch {
            setError('Erro ao carregar usuários.')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadUsers()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [loadUsers])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setFormLoading(true)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName,
                    email: formEmail,
                    password: formPassword,
                    role: formRole,
                }),
            })
            const json = await res.json()

            if (!res.ok) {
                setError(json.error || 'Erro ao criar usuário.')
            } else {
                setSuccess('Usuário criado com sucesso!')
                setShowForm(false)
                setFormName('')
                setFormEmail('')
                setFormPassword('')
                setFormRole('operator')
                await loadUsers()
                setTimeout(() => setSuccess(''), 4000)
            }
        } catch {
            setError('Erro de conexão.')
        }
        setFormLoading(false)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"? Essa ação é irreversível.`)) return

        setError('')
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const json = await res.json()
                setError(json.error || 'Erro ao excluir.')
            } else {
                setSuccess('Usuário excluído.')
                await loadUsers()
                setTimeout(() => setSuccess(''), 4000)
            }
        } catch {
            setError('Erro de conexão.')
        }
    }

    const handleEditSave = async (id: string) => {
        setError('')
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: editName, role: editRole }),
            })
            if (!res.ok) {
                const json = await res.json()
                setError(json.error || 'Erro ao atualizar.')
            } else {
                setSuccess('Usuário atualizado.')
                setEditingId(null)
                await loadUsers()
                setTimeout(() => setSuccess(''), 4000)
            }
        } catch {
            setError('Erro de conexão.')
        }
    }

    const startEdit = (user: AdminUser) => {
        setEditingId(user.id)
        setEditName(user.name)
        setEditRole(user.role)
    }

    return (
        <div className="admin-page-shell medium">
            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Gerenciar Usuários</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        Crie e gerencie os acessos ao painel administrativo
                    </p>
                </div>
                <div className="admin-header-actions">
                    <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={loadUsers}>
                        <RefreshCw size={14} />
                    </button>
                    <button className="fh-btn fh-btn-primary fh-btn-sm" onClick={() => { setShowForm(true); setError('') }}>
                        <UserPlus size={14} /> Novo Usuário
                    </button>
                </div>
            </div>

            {/* Messages */}
            {success && (
                <div style={{
                    background: 'var(--color-success-bg)',
                    border: '1px solid rgba(34,197,94,.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: 'var(--color-success)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <CheckCircle size={16} /> {success}
                </div>
            )}
            {error && (
                <div style={{
                    background: 'var(--color-danger-bg)',
                    border: '1px solid rgba(220,38,38,.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: 'var(--color-danger)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="fh-card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                            <UserPlus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                            Criar Novo Usuário
                        </h2>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="admin-form-grid-2">
                        <div>
                            <label className="fh-label">
                                <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                Nome
                            </label>
                            <input
                                className="fh-input"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Nome completo"
                                required
                            />
                        </div>
                        <div>
                            <label className="fh-label">
                                <Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                E-mail
                            </label>
                            <input
                                className="fh-input"
                                type="email"
                                value={formEmail}
                                onChange={e => setFormEmail(e.target.value)}
                                placeholder="usuario@empresa.com.br"
                                required
                            />
                        </div>
                        <div>
                            <label className="fh-label">
                                <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                Senha
                            </label>
                            <input
                                className="fh-input"
                                type="password"
                                value={formPassword}
                                onChange={e => setFormPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                minLength={6}
                                required
                            />
                        </div>
                        <div>
                            <label className="fh-label">
                                <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                Permissão
                            </label>
                            <select
                                className="fh-input"
                                value={formRole}
                                onChange={e => setFormRole(e.target.value as AdminRole)}
                                style={{ cursor: 'pointer' }}
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label} — {role.description}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-form-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                                type="button"
                                className="fh-btn fh-btn-ghost fh-btn-sm"
                                onClick={() => setShowForm(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="fh-btn fh-btn-primary fh-btn-sm"
                                disabled={formLoading}
                            >
                                {formLoading ? (
                                    <><Loader2 size={14} className="animate-spin" /> Criando...</>
                                ) : (
                                    <><UserPlus size={14} /> Criar Usuário</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            <div className="fh-card admin-table-shell">
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                        Carregando...
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <UserPlus size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                        <p>Nenhum usuário cadastrado</p>
                        <p style={{ fontSize: '12px', marginTop: '4px' }}>Clique em &quot;Novo Usuário&quot; para começar.</p>
                    </div>
                ) : (
                    <>
                        <table className="fh-table admin-table-desktop">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Permissão</th>
                                    <th>Criado em</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    (() => {
                                        const rolePresentation = getRolePresentation(user.role)
                                        return (
                                    <tr key={user.id}>
                                        <td>
                                            {editingId === user.id ? (
                                                <input
                                                    className="fh-input"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    style={{ padding: '4px 8px', fontSize: '13px' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: rolePresentation.gradient,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                                                    }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{user.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {editingId === user.id ? (
                                                <select
                                                    className="fh-input"
                                                    value={editRole}
                                                    onChange={e => setEditRole(e.target.value)}
                                                    style={{ padding: '4px 8px', fontSize: '13px', cursor: 'pointer', width: '180px' }}
                                                >
                                                    {ROLE_OPTIONS.map((role) => (
                                                        <option key={role.value} value={role.value}>{role.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`fh-badge ${rolePresentation.badgeClass}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {rolePresentation.icon}
                                                    {rolePresentation.label}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {editingId === user.id ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="fh-btn fh-btn-sm fh-btn-outline"
                                                        onClick={() => handleEditSave(user.id)}
                                                        title="Salvar"
                                                    >
                                                        <Save size={12} /> Salvar
                                                    </button>
                                                    <button
                                                        className="fh-btn fh-btn-sm fh-btn-ghost"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="fh-btn fh-btn-sm fh-btn-ghost"
                                                        onClick={() => startEdit(user)}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        className="fh-btn fh-btn-sm fh-btn-danger"
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                        )
                                    })()
                                ))}
                            </tbody>
                        </table>
                        <div className="admin-table-mobile">
                            {users.map((user) => (
                                <div key={user.id} className="admin-mobile-card">
                                    <div className="admin-mobile-card-head">
                                        <div>
                                            <div className="admin-mobile-card-title">{user.name}</div>
                                            <div className="admin-mobile-card-subtitle">
                                                Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                        {editingId === user.id ? (
                                            <select
                                                className="fh-input"
                                                value={editRole}
                                                onChange={e => setEditRole(e.target.value)}
                                                style={{ padding: '4px 8px', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                {ROLE_OPTIONS.map((role) => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={`fh-badge ${getRolePresentation(user.role).badgeClass}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {getRolePresentation(user.role).icon}
                                                {getRolePresentation(user.role).label}
                                            </span>
                                        )}
                                    </div>
                                    {editingId === user.id ? (
                                        <input
                                            className="fh-input"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: '13px' }}
                                        />
                                    ) : null}
                                    <div className="admin-mobile-card-actions">
                                        {editingId === user.id ? (
                                            <>
                                                <button
                                                    className="fh-btn fh-btn-sm fh-btn-outline"
                                                    onClick={() => handleEditSave(user.id)}
                                                    title="Salvar"
                                                >
                                                    <Save size={12} /> Salvar
                                                </button>
                                                <button
                                                    className="fh-btn fh-btn-sm fh-btn-ghost"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X size={12} /> Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="fh-btn fh-btn-sm fh-btn-ghost"
                                                    onClick={() => startEdit(user)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={12} /> Editar
                                                </button>
                                                <button
                                                    className="fh-btn fh-btn-sm fh-btn-danger"
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={12} /> Excluir
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Legend */}
            <div className="admin-info-box">
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Permissões
                </p>
                <div className="admin-inline-stack" style={{ fontSize: '12px', color: 'var(--text-secondary)', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <Shield size={13} color="var(--color-success)" />
                        <strong style={{ color: '#fff' }}>Admin:</strong> Acesso total — pode criar, editar e excluir reservas, configurações e usuários
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <User size={13} color="#C9A84C" />
                        <strong style={{ color: '#fff' }}>Gerente:</strong> Opera a unidade, acompanha reservas e ajusta configurações
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <Eye size={13} color="#5B8DEF" />
                        <strong style={{ color: '#fff' }}>Operador:</strong> Opera reservas do dia a dia e acompanha o painel operacional
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
