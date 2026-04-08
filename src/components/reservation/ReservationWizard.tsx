'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Users, Calendar, Clock, Phone, User, Loader2, Copy, AlertTriangle, type LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────
interface Unit {
    id: string
    name: string
    slug: string
    address?: string
    phone?: string
}

interface Environment {
    id: string
    name: string
    capacity: number
}

interface WizardState {
    pax: number
    date: string
    time: string
    environmentId: string | null
    name: string
    email: string
    phone: string
    occasion: string | null
    notes: string
}

interface ReservationRules {
    minPax: number
    maxPax: number
}

interface Props {
    unit: Unit
    environments: Environment[]
    reservationRules?: ReservationRules
    availableSlots: Record<string, { available: boolean; count: number }>
    reservationCodePrefix?: string
}

const OCCASIONS = [
    { id: 'birthday', emoji: '🎂', label: 'Aniversário' },
    { id: 'anniversary', emoji: '💑', label: 'Anos de Casal' },
    { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Reunião' },
    { id: 'work', emoji: '💼', label: 'Empresa' },
    { id: 'proposal', emoji: '💍', label: 'Pedido' },
    { id: null, emoji: '🍽️', label: 'Jantar' },
]

const TIME_SLOTS = [
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
]

const DEFAULT_RESERVATION_RULES: ReservationRules = {
    minPax: 1,
    maxPax: 20,
}

function clampPax(value: number, minPax: number, maxPax: number) {
    return Math.min(maxPax, Math.max(minPax, Math.floor(value)))
}

function formatWhatsappDisplay(phone: string) {
    const digits = phone.replace(/\D/g, '')

    if (digits.length === 11) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`
    }

    if (digits.length === 10) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
    }

    return digits || phone
}

// ─── Animations Variants ─────────────────────────────
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0,
        filter: 'blur(8px)',
        scale: 0.98
    }),
    center: {
        x: 0,
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 30 : -30,
        opacity: 0,
        filter: 'blur(8px)',
        scale: 0.98,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    })
} satisfies Variants

// ─── Shared UI Logic ─────────────────────────────────
const GlassCard = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '28px',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        ...style
    }}>
        {children}
    </div>
)

const ThemedLabel = ({ children, icon: Icon }: { children: React.ReactNode, icon?: LucideIcon }) => (
    <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px'
    }}>
        {Icon && <Icon size={14} color="#F47920" />}
        {children}
    </label>
)

// ─── Mini Calendar ────────────────────────────────────
function MiniCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
    const today = new Date()
    const [view, setView] = useState(() => {
        const d = new Date()
        return { year: d.getFullYear(), month: d.getMonth() }
    })

    const days = () => {
        const first = new Date(view.year, view.month, 1)
        const last = new Date(view.year, view.month + 1, 0)
        const blanks = first.getDay()
        const result: (number | null)[] = Array(blanks).fill(null)
        for (let d = 1; d <= last.getDate(); d++) result.push(d)
        return result
    }

    const fmt = (d: number) => {
        const m = String(view.month + 1).padStart(2, '0')
        const dd = String(d).padStart(2, '0')
        return `${view.year}-${m}-${dd}`
    }

    const isPast = (d: number) => {
        const dt = new Date(view.year, view.month, d)
        dt.setHours(0, 0, 0, 0)
        const t = new Date(); t.setHours(0, 0, 0, 0)
        return dt < t
    }

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <motion.button whileTap={{ scale: 0.8 }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px' }}
                    onClick={() => setView(v => {
                        const d = new Date(v.year, v.month - 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                    })}>‹</motion.button>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff', letterSpacing: '-0.02em' }}>
                    {monthNames[view.month]} {view.year}
                </span>
                <motion.button whileTap={{ scale: 0.8 }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px' }}
                    onClick={() => setView(v => {
                        const d = new Date(v.year, v.month + 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                    })}>›</motion.button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '8px' }}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                {days().map((d, i) => {
                    if (!d) return <div key={i} />
                    const dateStr = fmt(d)
                    const isSelected = dateStr === value
                    const isToday = dateStr === today.toISOString().split('T')[0]
                    const past = isPast(d)

                    return (
                        <motion.button
                            key={i}
                            whileHover={!past && !isSelected ? { scale: 1.1, background: 'rgba(255,255,255,0.1)' } : {}}
                            whileTap={!past ? { scale: 0.9 } : {}}
                            onClick={() => !past && onChange(dateStr)}
                            disabled={past}
                            style={{
                                height: '38px', width: '100%', borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: isSelected ? 800 : 500,
                                background: isSelected ? '#F47920' : isToday ? 'rgba(244,121,32,0.1)' : 'transparent',
                                color: isSelected ? '#fff' : past ? 'rgba(255,255,255,0.15)' : isToday ? '#F47920' : 'rgba(255,255,255,0.8)',
                                border: isToday && !isSelected ? '1px solid rgba(244,121,32,0.3)' : '1px solid transparent',
                                cursor: past ? 'default' : 'pointer',
                                transition: 'background 0.2s',
                                boxShadow: isSelected ? '0 4px 16px rgba(244,121,32,0.4)' : 'none'
                            }}
                        >
                            {d}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Step 1: Details ──────────────────────────────────
function Step1({
    state,
    reservationRules,
    onChange,
}: {
    state: WizardState
    reservationRules: ReservationRules
    onChange: (k: keyof WizardState, v: unknown) => void
}) {
    const minPax = Math.max(1, reservationRules.minPax)
    const maxPax = Math.max(minPax, reservationRules.maxPax)
    const quickPaxLimit = Math.min(maxPax, 10)
    const quickPaxOptions = useMemo(() => {
        if (minPax > quickPaxLimit) return []
        return Array.from({ length: quickPaxLimit - minPax + 1 }, (_, index) => minPax + index)
    }, [minPax, quickPaxLimit])
    const [customPax, setCustomPax] = useState(() => (
        state.pax > quickPaxLimit || minPax > quickPaxLimit ? String(state.pax || '') : ''
    ))

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (state.pax > quickPaxLimit || minPax > quickPaxLimit) {
                setCustomPax(state.pax ? String(state.pax) : '')
                return
            }

            setCustomPax('')
        }, 0)

        return () => window.clearTimeout(timer)
    }, [state.pax, minPax, quickPaxLimit])

    const handleCustomPaxChange = (rawValue: string) => {
        setCustomPax(rawValue)

        if (!rawValue) {
            onChange('pax', 0)
            return
        }

        const numericValue = Number(rawValue)
        if (!Number.isFinite(numericValue)) return

        onChange('pax', Math.floor(numericValue))
    }

    const handleCustomPaxBlur = () => {
        if (!customPax) return

        const numericValue = Number(customPax)
        if (!Number.isFinite(numericValue)) {
            setCustomPax('')
            onChange('pax', 0)
            return
        }

        const normalizedValue = clampPax(numericValue, minPax, maxPax)
        setCustomPax(String(normalizedValue))
        onChange('pax', normalizedValue)
    }

    const selectedQuickOption = quickPaxOptions.includes(state.pax)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <ThemedLabel icon={Users}>Para quantas pessoas?</ThemedLabel>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '14px', lineHeight: 1.6 }}>
                    Esta unidade aceita reservas de <strong style={{ color: '#fff' }}>{minPax}</strong> a <strong style={{ color: '#fff' }}>{maxPax}</strong> pessoas.
                </p>
                {quickPaxOptions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {quickPaxOptions.map(n => {
                            const selected = state.pax === n
                            return (
                                <motion.button
                                    key={n}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onChange('pax', n)}
                                    style={{
                                        width: '48px', height: '48px', borderRadius: '16px',
                                        background: selected ? '#F47920' : 'rgba(255,255,255,0.03)',
                                        border: selected ? '1px solid #F47920' : '1px solid rgba(255,255,255,0.1)',
                                        color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
                                        fontSize: '16px', fontWeight: selected ? 800 : 600,
                                        cursor: 'pointer',
                                        boxShadow: selected ? '0 8px 20px rgba(244,121,32,0.3)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {n}
                                </motion.button>
                            )
                        })}
                    </div>
                )}

                {maxPax > 10 && (
                    <div style={{
                        marginTop: quickPaxOptions.length > 0 ? '16px' : 0,
                        padding: '18px',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                            Grupos maiores: digite a quantidade
                        </label>
                        <input
                            type="number"
                            min={minPax}
                            max={maxPax}
                            value={customPax}
                            onChange={e => handleCustomPaxChange(e.target.value)}
                            onBlur={handleCustomPaxBlur}
                            placeholder={`De ${Math.max(minPax, 11)} a ${maxPax}`}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '16px',
                                border: state.pax > 0 && !selectedQuickOption && (state.pax < minPax || state.pax > maxPax)
                                    ? '1px solid rgba(239,68,68,0.5)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: 600,
                                outline: 'none',
                            }}
                        />
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>
                            Use esse campo para reservas acima de 10 pessoas.
                        </p>
                    </div>
                )}

                {state.pax > 0 && (state.pax < minPax || state.pax > maxPax) && (
                    <p style={{ fontSize: '12px', color: '#fda4af', marginTop: '12px' }}>
                        Escolha uma quantidade entre {minPax} e {maxPax} pessoas.
                    </p>
                )}
            </div>

            {state.pax >= minPax && state.pax <= maxPax && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <ThemedLabel icon={Calendar}>E para quando?</ThemedLabel>
                    <MiniCalendar value={state.date} onChange={d => onChange('date', d)} />
                </motion.div>
            )}

            {state.date && state.pax >= minPax && state.pax <= maxPax && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <ThemedLabel icon={Clock}>Em qual horário?</ThemedLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                        {TIME_SLOTS.map(t => {
                            const selected = state.time === t
                            return (
                                <motion.button
                                    key={t}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onChange('time', t)}
                                    style={{
                                        padding: '14px 0', borderRadius: '16px',
                                        background: selected ? '#F47920' : 'rgba(255,255,255,0.03)',
                                        border: selected ? '1px solid #F47920' : '1px solid rgba(255,255,255,0.1)',
                                        color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
                                        fontSize: '15px', fontWeight: selected ? 800 : 600,
                                        cursor: 'pointer',
                                        boxShadow: selected ? '0 8px 20px rgba(244,121,32,0.3)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {t}
                                </motion.button>
                            )
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    )
}

// ─── Step 2: Environment ──────────────────────────────
function Step2({ state, environments, onChange }: {
    state: WizardState, environments: Environment[], onChange: (k: keyof WizardState, v: unknown) => void
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <ThemedLabel>Preferência de Ambiente</ThemedLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {environments.map(env => {
                        const selected = state.environmentId === env.id
                        const overCapacity = state.pax > env.capacity
                        return (
                            <motion.div
                                key={env.id}
                                whileHover={!overCapacity ? { scale: 1.01 } : {}}
                                whileTap={!overCapacity ? { scale: 0.98 } : {}}
                                onClick={() => !overCapacity && onChange('environmentId', env.id)}
                                style={{
                                    padding: '20px 24px', borderRadius: '18px',
                                    background: selected ? 'rgba(244,121,32,0.1)' : 'rgba(255,255,255,0.02)',
                                    border: selected ? '1px solid #F47920' : '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: overCapacity ? 'not-allowed' : 'pointer',
                                    opacity: overCapacity ? 0.4 : 1
                                }}
                            >
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{env.name}</h4>
                                    <span style={{ fontSize: '13px', color: overCapacity ? '#ef4444' : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                        Capacidade: {env.capacity} pessoas {overCapacity && '(Grupo excedido)'}
                                    </span>
                                </div>
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    border: selected ? '6px solid #F47920' : '2px solid rgba(255,255,255,0.2)',
                                    transition: 'all 0.2s'
                                }} />
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            <div>
                <ThemedLabel>Celebração Espetacular?</ThemedLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                    {OCCASIONS.map(occ => {
                        const selected = state.occasion === occ.id
                        return (
                            <motion.button
                                key={String(occ.id)}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onChange('occasion', occ.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                    padding: '16px', borderRadius: '16px',
                                    background: selected ? 'rgba(244,121,32,0.15)' : 'rgba(255,255,255,0.02)',
                                    border: selected ? '1px solid rgba(244,121,32,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                    color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '28px', filter: selected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' : 'none' }}>{occ.emoji}</span>
                                <span style={{ fontSize: '12px', fontWeight: selected ? 600 : 500 }}>{occ.label}</span>
                            </motion.button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Step 3: Customer Data ────────────────────────────
type DarkInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: LucideIcon
    label: string
}

const DarkInput = ({ icon: Icon, label, style, ...props }: DarkInputProps) => (
    <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            {Icon && <Icon size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '16px', top: '16px' }} />}
            <input
                {...props}
                style={{
                    width: '100%', padding: '16px 16px 16px ' + (Icon ? '48px' : '16px'),
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#fff', fontSize: '15px', fontWeight: 500,
                    outline: 'none', transition: 'all 0.2s',
                    ...style
                }}
                onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                    event.currentTarget.style.borderColor = '#F47920'
                    event.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                    event.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    event.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
            />
        </div>
    </div>
)

function Step3({
    state,
    onChange,
    checkingWeeklyReservation,
    hasWeeklyReservationConflict,
}: {
    state: WizardState
    onChange: (k: keyof WizardState, v: unknown) => void
    checkingWeeklyReservation: boolean
    hasWeeklyReservationConflict: boolean
}) {
    const formatPhone = (val: string) => {
        const num = val.replace(/\D/g, '')
        if (num.length <= 2) return num
        if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
        return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`
    }

    return (
        <div>
            <DarkInput
                icon={User}
                label="Nome completo"
                placeholder="Ex: Lucas Villela"
                value={state.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange('name', event.target.value)}
            />
            <DarkInput
                icon={Phone}
                label="WhatsApp"
                placeholder="(21) 90000-0000"
                type="tel"
                value={state.phone}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange('phone', formatPhone(event.target.value))}
            />

            {checkingWeeklyReservation && (
                <button
                    type="button"
                    disabled
                    style={{
                        width: '100%',
                        marginBottom: '16px',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '14px',
                        fontWeight: 600,
                    }}
                >
                    Verificando reservas deste telefone...
                </button>
            )}

            {hasWeeklyReservationConflict && (
                <button
                    type="button"
                    disabled
                    style={{
                        width: '100%',
                        marginBottom: '18px',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        border: '1px solid rgba(245,158,11,0.4)',
                        background: 'rgba(245,158,11,0.12)',
                        color: '#fcd34d',
                        fontSize: '14px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <AlertTriangle size={16} />
                    Você já possui uma reserva nessa mesma semana.
                </button>
            )}

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', marginTop: '4px' }}>
                Alguma nota secreta para nossa equipe?
            </label>
            <textarea
                value={state.notes}
                onChange={e => onChange('notes', e.target.value)}
                placeholder="Alergias, preferências, etc."
                rows={2}
                style={{
                    width: '100%', padding: '16px', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: '15px', resize: 'none', outline: 'none', fontFamily: 'inherit'
                }}
            />
        </div>
    )
}

// ─── Step 4: Success Celebration ──────────────────────
function Step4({ code, phone }: { code: string, phone: string }) {
    const [copied, setCopied] = useState(false)
    const displayPhone = formatWhatsappDisplay(phone)

    const copy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} style={{ textAlign: 'center' }}>
            <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 1, type: 'spring', delay: 0.2 }}
                style={{
                    width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #F47920, #C45E0A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                    boxShadow: '0 12px 32px rgba(244,121,32,0.4)',
                    border: '4px solid rgba(255,255,255,0.1)'
                }}
            >
                <Check size={48} color="#fff" strokeWidth={3} />
            </motion.div>

            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>Tudo pronto!</h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>Sua reserva está confirmada!</p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>Seu código exclusivo</p>
                <motion.div whileTap={{ scale: 0.95 }} onClick={copy} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
                    fontSize: '40px', fontWeight: 900, fontFamily: 'monospace', color: '#F47920',
                    letterSpacing: '0.05em', cursor: 'pointer'
                }}>
                    {code}
                    {copied ? <Check size={24} color="#22c55e" /> : <Copy size={24} color="rgba(255,255,255,0.2)" />}
                </motion.div>
                <p style={{ fontSize: '13px', color: '#22c55e', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Check size={16} /> Reserva enviada agora no seu WhatsApp {displayPhone}.
                </p>
            </div>
        </motion.div>
    )
}

// ─── Main Component ───────────────────────────────────
export default function ReservationWizard({ unit, environments, reservationRules, reservationCodePrefix = 'RS' }: Props) {
    const [[step, direction], setPage] = useState([1, 0])
    const [loading, setLoading] = useState(false)
    const [confirmCode, setConfirmCode] = useState('')
    const [checkingWeeklyReservation, setCheckingWeeklyReservation] = useState(false)
    const [hasWeeklyReservationConflict, setHasWeeklyReservationConflict] = useState(false)
    const normalizedReservationRules = useMemo(() => {
        const minPax = Math.max(1, Number(reservationRules?.minPax ?? DEFAULT_RESERVATION_RULES.minPax))
        const maxPax = Math.max(minPax, Number(reservationRules?.maxPax ?? DEFAULT_RESERVATION_RULES.maxPax))

        return { minPax, maxPax }
    }, [reservationRules?.minPax, reservationRules?.maxPax])

    const [state, setState] = useState<WizardState>({
        pax: 0, date: '', time: '', environmentId: null,
        name: '', email: '', phone: '', occasion: null, notes: '',
    })

    const change = (key: keyof WizardState, value: unknown) => setState(s => ({ ...s, [key]: value }))

    useEffect(() => {
        if (step !== 3 || state.phone.length < 14 || !state.date) {
            setCheckingWeeklyReservation(false)
            setHasWeeklyReservationConflict(false)
            return
        }

        let cancelled = false
        const timeoutId = window.setTimeout(async () => {
            setCheckingWeeklyReservation(true)

            try {
                const params = new URLSearchParams({
                    phone: state.phone,
                    date: state.date,
                })
                const response = await fetch(`/api/reservations/weekly-check?${params.toString()}`)
                const data = await response.json()

                if (cancelled) return

                if (!response.ok) {
                    setHasWeeklyReservationConflict(false)
                    return
                }

                setHasWeeklyReservationConflict(Boolean(data.hasReservation))
            } catch {
                if (!cancelled) {
                    setHasWeeklyReservationConflict(false)
                }
            } finally {
                if (!cancelled) {
                    setCheckingWeeklyReservation(false)
                }
            }
        }, 300)

        return () => {
            cancelled = true
            window.clearTimeout(timeoutId)
        }
    }, [step, state.phone, state.date])

    const canAdvance = () => {
        if (step === 1) return state.pax >= normalizedReservationRules.minPax && state.pax <= normalizedReservationRules.maxPax && !!state.date && !!state.time
        if (step === 2) return true
        if (step === 3) return !!state.name && !!state.phone && state.phone.length >= 14 && !checkingWeeklyReservation && !hasWeeklyReservationConflict
        return false
    }

    const paginate = (newDirection: number) => {
        setPage([step + newDirection, newDirection])
    }

    const submit = async () => {
        setLoading(true)
        // Simulated magical loading to give that "Apple Processing" feel
        await new Promise(r => setTimeout(r, 1200))
        try {
            const res = await fetch('/api/reservations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitId: unit.id, ...state }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setConfirmCode(data.confirmation_code || `${reservationCodePrefix}-${Math.floor(Math.random() * 9000 + 1000)}`)
            paginate(1)
        } catch (err: unknown) {
            alert('Não foi possível finalizar a reserva. ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>

            {/* Minimalist Progress Indicators */}
            {step < 4 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
                    {[1, 2, 3].map(n => (
                        <div key={n} style={{
                            height: '4px', width: step === n ? '32px' : '12px',
                            background: step >= n ? '#F47920' : 'rgba(255,255,255,0.1)',
                            borderRadius: '2px', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} />
                    ))}
                </div>
            )}

            <GlassCard style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        style={{ flex: 1 }}
                    >
                        {step === 1 && <Step1 state={state} reservationRules={normalizedReservationRules} onChange={change} />}
                        {step === 2 && <Step2 state={state} environments={environments} onChange={change} />}
                        {step === 3 && (
                            <Step3
                                state={state}
                                onChange={change}
                                checkingWeeklyReservation={checkingWeeklyReservation}
                                hasWeeklyReservationConflict={hasWeeklyReservationConflict}
                            />
                        )}
                        {step === 4 && <Step4 code={confirmCode} phone={state.phone} />}
                    </motion.div>
                </AnimatePresence>
            </GlassCard>

            {/* Smart Floating Next Button - The "1%" Magic */}
            <AnimatePresence>
                {step < 4 && canAdvance() && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{
                            position: 'sticky', bottom: '40px', marginTop: '40px',
                            display: 'flex', justifyContent: 'center', zIndex: 50
                        }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => step === 3 ? submit() : paginate(1)}
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                background: 'linear-gradient(135deg, #FF9A4D, #F47920)',
                                color: '#fff', border: 'none', borderRadius: '99px',
                                padding: '16px 40px', fontSize: '18px', fontWeight: 700,
                                cursor: 'pointer', boxShadow: '0 16px 40px rgba(244,121,32,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                                pointerEvents: loading ? 'none' : 'auto'
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                <>
                                    {step === 3 ? 'Finalizar Reserva' : 'Continuar'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subtle Back Button outside the main flow to avoid attention */}
            <AnimatePresence>
                {step > 1 && step < 4 && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => paginate(-1)}
                        style={{
                            position: 'absolute', top: '16px', left: '-60px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.6)', borderRadius: '50%',
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(20px)'
                        }}
                        whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    )
}
