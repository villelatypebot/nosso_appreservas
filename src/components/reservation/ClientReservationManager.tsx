'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Calendar, Clock, Users, ArrowRight, Loader2, Edit3, X, Check, Eye } from 'lucide-react'

// Opcional: Reutilizar lógica de horários do sistema (aqui em hardcode por agilidade)
const TIME_SLOTS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']

export default function ClientReservationManager() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reservation, setReservation] = useState<any>(null)
    const [editMode, setEditMode] = useState(false)

    // Edit Form State
    const [editForm, setEditForm] = useState({ pax: 0, date: '', time: '' })

    const fetchReservation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code || code.length < 4) return

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/client-reservation?code=${encodeURIComponent(code)}`)
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            setReservation(json.reservation)
            setEditForm({
                pax: json.reservation.pax,
                date: json.reservation.reservation_date,
                time: json.reservation.reservation_time
            })
        } catch (err: unknown) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const saveChanges = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/client-reservation', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    updates: editForm
                })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)

            // Atualiza reserva local com dados novos
            setReservation(json.reservation)
            setEditMode(false)
        } catch (err: unknown) {
            alert('Não conseguimos salvar suas alterações: ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    // ─── Componentes Visuais Menores ─────────────────
    const Label = ({ children }: { children: React.ReactNode }) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {children}
        </span>
    )

    // Se NÃO tem reserva, mostra tela de busca
    if (!reservation) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '400px' }}>
                <form onSubmit={fetchReservation} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '24px', color: 'rgba(255,255,255,0.3)' }}>
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="FH-XXXX"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        style={{
                            width: '100%', padding: '22px 20px 22px 56px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px', color: '#fff', fontSize: '20px', fontWeight: 600,
                            letterSpacing: '0.1em', outline: 'none', textTransform: 'uppercase',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)'
                        }}
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        disabled={loading || code.length < 5}
                        style={{
                            position: 'absolute', right: '12px', top: '12px', bottom: '12px',
                            background: '#F47920', border: 'none', borderRadius: '16px',
                            width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff', opacity: (loading || code.length < 5) ? 0.5 : 1
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    </motion.button>
                </form>
                {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>{error}</p>}
            </motion.div>
        )
    }

    // TELA DE DETALHES/EDIÇÃO
    const st = reservation.status
    const bgStatus = st === 'confirmed' ? 'rgba(34,197,94,0.1)' : st === 'pending' ? 'rgba(244,121,32,0.1)' : 'rgba(239,68,68,0.1)'
    const colorStatus = st === 'confirmed' ? '#22c55e' : st === 'pending' ? '#F47920' : '#ef4444'
    const labelStatus = st === 'confirmed' ? 'Confirmada' : st === 'pending' ? 'Pendente' : st === 'cancelled' ? 'Cancelada' : st

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '600px' }}>
            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '32px', padding: '32px', backdropFilter: 'blur(40px)', position: 'relative'
            }}>

                {/* Status Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ background: bgStatus, color: colorStatus, padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {labelStatus}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: 'monospace' }}>#{reservation.confirmation_code}</span>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>Olá, {reservation.customers.name.split(' ')[0]}</h2>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    <div>
                        <Label>Unidade</Label>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 600, marginTop: '8px' }}>
                            <MapPin size={16} color="#F47920" /> {reservation.units.name}
                        </p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', paddingLeft: '24px' }}>
                            {reservation.environments?.name || 'Ambiente Padrão'}
                        </p>
                    </div>

                    <div>
                        <Label>Contato Reservado</Label>
                        <p style={{ color: '#fff', fontWeight: 500, marginTop: '8px', fontSize: '14px' }}>{reservation.customers.phone}</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '2px' }}>{reservation.customers.email || 'Sem email'}</p>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 -32px 32px' }} />

                {/* Edit Form or Viewing */}
                {!editMode ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Detalhes do Evento</h3>
                            {(st === 'pending' || st === 'confirmed') && (
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditMode(true)} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                    color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <Edit3 size={14} /> Alterar
                                </motion.button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '20px' }}>
                            <div>
                                <Label>Data</Label>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginTop: '6px' }}><Calendar size={14} color="#F47920" /> {reservation.reservation_date.split('-').reverse().join('/')}</p>
                            </div>
                            <div>
                                <Label>Hora</Label>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginTop: '6px' }}><Clock size={14} color="#F47920" /> {reservation.reservation_time.slice(0, 5)}</p>
                            </div>
                            <div>
                                <Label>Pessoas</Label>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginTop: '6px' }}><Users size={14} color="#F47920" /> {reservation.pax}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F47920' }}>Modo de Edição</h3>
                            <button onClick={() => setEditMode(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <Label>Mudar Data</Label>
                                    <input type="date" value={editForm.date} onChange={e => setEditForm(pd => ({ ...pd, date: e.target.value }))} style={{
                                        width: '100%', padding: '12px', marginTop: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none'
                                    }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Label>Pessoas</Label>
                                    <input type="number" value={editForm.pax} onChange={e => setEditForm(pd => ({ ...pd, pax: Number(e.target.value) }))} style={{
                                        width: '100%', padding: '12px', marginTop: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none'
                                    }} />
                                </div>
                            </div>

                            <div>
                                <Label>Mudar Horário</Label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {TIME_SLOTS.map(t => (
                                        <button key={t} onClick={() => setEditForm(pd => ({ ...pd, time: t }))} style={{
                                            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                            background: editForm.time.includes(t) ? '#F47920' : 'rgba(255,255,255,0.05)',
                                            color: editForm.time.includes(t) ? '#fff' : 'rgba(255,255,255,0.6)',
                                            border: editForm.time.includes(t) ? '1px solid #F47920' : '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={saveChanges} disabled={loading} style={{
                                background: '#22c55e', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                            }}>
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Salvar Magia
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Logout/Search again CTA */}
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <button onClick={() => setReservation(null)} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline'
                }}>
                    Acessar outro código
                </button>
            </div>
        </motion.div>
    )
}
