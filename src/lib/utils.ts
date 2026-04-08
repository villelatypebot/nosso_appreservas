import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ReservationStatus } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy") {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
    return format(d, fmt, { locale: ptBR })
}

export function formatDateTime(date: string | Date) {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatTime(time: string) {
    return time.substring(0, 5)
}

export function generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const prefix = (process.env.NEXT_PUBLIC_RESERVATION_CODE_PREFIX || 'RS').toUpperCase()
    let code = `${prefix}-`
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export function generateTimeSlots(
    openTime: string,
    closeTime: string,
    intervalMinutes: number
): string[] {
    const slots: string[] = []
    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)

    let currentMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM

    while (currentMinutes < closeMinutes) {
        const h = Math.floor(currentMinutes / 60)
        const m = currentMinutes % 60
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
        currentMinutes += intervalMinutes
    }
    return slots
}

export function statusLabel(status: ReservationStatus): string {
    const map: Record<ReservationStatus, string> = {
        pending: 'Pendente',
        confirmed: 'Confirmada',
        seated: 'Sentado',
        no_show: 'Não compareceu',
        cancelled: 'Cancelada',
    }
    return map[status] || status
}

export function statusBadgeClass(status: ReservationStatus): string {
    const map: Record<ReservationStatus, string> = {
        pending: 'badge-pending',
        confirmed: 'badge-confirmed',
        seated: 'badge-seated',
        no_show: 'badge-no_show',
        cancelled: 'badge-cancelled',
    }
    return map[status] || ''
}

export function dayOfWeekLabel(day: number): string {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return days[day] || String(day)
}

export function pluralize(n: number, singular: string, plural: string): string {
    return n === 1 ? `${n} ${singular}` : `${n} ${plural}`
}

export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
}

export function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str
}
