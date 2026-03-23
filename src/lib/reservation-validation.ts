import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ReservationStatus } from './supabase/types'

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'seated']
const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'

type ReservationRuleRow = Database['public']['Tables']['reservation_rules']['Row']
type TimeSlotRow = Database['public']['Tables']['time_slots']['Row']
type DateBlockRow = Database['public']['Tables']['date_blocks']['Row']
type EnvironmentRow = Database['public']['Tables']['environments']['Row']

export class ReservationValidationError extends Error {
    status: number

    constructor(message: string, status = 400) {
        super(message)
        this.name = 'ReservationValidationError'
        this.status = status
    }
}

interface ReservationValidationInput {
    unitId: string
    environmentId?: string | null
    pax: number
    date: string
    time: string
    excludeReservationId?: string | null
}

export function normalizeReservationTime(time: string) {
    if (!time) return time
    if (time.length === 5) return `${time}:00`
    return time.slice(0, 8)
}

export function buildReservationCustomData(occasion?: string | null) {
    const customData: Record<string, string> = {}

    if (occasion) {
        customData.occasion = occasion
    }

    return customData
}

function toMinutes(time: string | null) {
    if (!time) return null
    const normalized = normalizeReservationTime(time)
    const [hours, minutes] = normalized.split(':').map(Number)
    return hours * 60 + minutes
}

function getSaoPauloToday() {
    const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: SAO_PAULO_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date())

    return new Date(`${localDate}T00:00:00-03:00`)
}

function isBlockedForTime(block: Pick<DateBlockRow, 'start_time' | 'end_time'>, requestedMinutes: number) {
    const startMinutes = toMinutes(block.start_time)
    const endMinutes = toMinutes(block.end_time)

    if (startMinutes === null && endMinutes === null) return true
    if (startMinutes === null) return requestedMinutes < (endMinutes ?? 24 * 60)
    if (endMinutes === null) return requestedMinutes >= startMinutes

    return requestedMinutes >= startMinutes && requestedMinutes < endMinutes
}

function ensureValidTimeIncrement(slot: Pick<TimeSlotRow, 'open_time' | 'slot_interval_minutes'>, requestedTime: string) {
    const openMinutes = toMinutes(slot.open_time)
    const requestedMinutes = toMinutes(requestedTime)

    if (openMinutes === null || requestedMinutes === null) return

    const diff = requestedMinutes - openMinutes
    const interval = Math.max(slot.slot_interval_minutes || 30, 1)

    if (diff < 0 || diff % interval !== 0) {
        throw new ReservationValidationError('Horario invalido para este slot.')
    }
}

function getEnvironmentCapacity(environment: EnvironmentRow | null) {
    if (!environment) return null
    return environment.max_capacity ?? environment.capacity ?? null
}

async function fetchMatchingTimeSlot(
    supabase: SupabaseClient,
    unitId: string,
    dayOfWeek: number,
    normalizedTime: string
) {
    const { data, error } = await supabase
        .from('time_slots')
        .select('id, open_time, close_time, slot_interval_minutes, max_pax_per_slot')
        .eq('unit_id', unitId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('open_time', normalizedTime)
        .gt('close_time', normalizedTime)
        .order('open_time', { ascending: false })
        .limit(1)

    if (error) {
        throw new ReservationValidationError('Erro ao validar horarios da unidade.', 500)
    }

    return data?.[0] || null
}

async function fetchReservationRules(supabase: SupabaseClient, unitId: string) {
    const { data, error } = await supabase
        .from('reservation_rules')
        .select('*')
        .eq('unit_id', unitId)
        .maybeSingle()

    if (error) {
        throw new ReservationValidationError('Erro ao validar regras da unidade.', 500)
    }

    return data as ReservationRuleRow | null
}

async function fetchDateBlocks(supabase: SupabaseClient, unitId: string, date: string) {
    const { data, error } = await supabase
        .from('date_blocks')
        .select('start_time, end_time')
        .eq('unit_id', unitId)
        .eq('block_date', date)

    if (error) {
        throw new ReservationValidationError('Erro ao validar bloqueios de data.', 500)
    }

    return (data || []) as Pick<DateBlockRow, 'start_time' | 'end_time'>[]
}

async function fetchEnvironment(supabase: SupabaseClient, unitId: string, environmentId: string) {
    const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('id', environmentId)
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .maybeSingle()

    if (error) {
        throw new ReservationValidationError('Erro ao validar ambiente da reserva.', 500)
    }

    return data as EnvironmentRow | null
}

async function fetchReservedPax(
    supabase: SupabaseClient,
    filters: {
        unitId: string
        date: string
        time: string
        environmentId?: string | null
        excludeReservationId?: string | null
    }
) {
    let query = supabase
        .from('reservations')
        .select('id, pax')
        .eq('unit_id', filters.unitId)
        .eq('reservation_date', filters.date)
        .eq('reservation_time', filters.time)
        .in('status', ACTIVE_RESERVATION_STATUSES)

    if (filters.environmentId) {
        query = query.eq('environment_id', filters.environmentId)
    }

    if (filters.excludeReservationId) {
        query = query.neq('id', filters.excludeReservationId)
    }

    const { data, error } = await query

    if (error) {
        throw new ReservationValidationError('Erro ao validar lotacao da reserva.', 500)
    }

    return (data || []).reduce((sum, reservation) => sum + Number(reservation.pax || 0), 0)
}

export async function validateReservationRequest(
    supabase: SupabaseClient,
    input: ReservationValidationInput
) {
    const pax = Number(input.pax)
    const normalizedTime = normalizeReservationTime(input.time)

    if (!input.unitId || !input.date || !normalizedTime || !Number.isFinite(pax) || pax <= 0) {
        throw new ReservationValidationError('Dados da reserva invalidos.')
    }

    const requestedDate = new Date(`${input.date}T00:00:00-03:00`)
    const requestedAt = new Date(`${input.date}T${normalizedTime}-03:00`)

    if (Number.isNaN(requestedDate.getTime()) || Number.isNaN(requestedAt.getTime())) {
        throw new ReservationValidationError('Data ou horario invalidos.')
    }

    const dayOfWeek = requestedDate.getUTCDay()
    const [rules, slot, blocks, environment] = await Promise.all([
        fetchReservationRules(supabase, input.unitId),
        fetchMatchingTimeSlot(supabase, input.unitId, dayOfWeek, normalizedTime),
        fetchDateBlocks(supabase, input.unitId, input.date),
        input.environmentId ? fetchEnvironment(supabase, input.unitId, input.environmentId) : Promise.resolve(null),
    ])

    if (!slot) {
        throw new ReservationValidationError('Esse horario nao esta disponivel para reservas.')
    }

    ensureValidTimeIncrement(slot, normalizedTime)

    if (rules) {
        if (pax < rules.min_pax) {
            throw new ReservationValidationError(`A reserva minima para esta unidade e de ${rules.min_pax} pessoa(s).`)
        }

        if (pax > rules.max_pax) {
            throw new ReservationValidationError(`O limite por reserva nesta unidade e de ${rules.max_pax} pessoa(s).`)
        }

        if (requestedAt.getTime() < Date.now() + rules.min_advance_hours * 60 * 60 * 1000) {
            throw new ReservationValidationError(`As reservas precisam ser feitas com pelo menos ${rules.min_advance_hours} hora(s) de antecedencia.`)
        }

        const latestAllowedDate = new Date(getSaoPauloToday().getTime() + rules.max_advance_days * 24 * 60 * 60 * 1000)
        if (requestedDate.getTime() > latestAllowedDate.getTime()) {
            throw new ReservationValidationError(`As reservas para esta unidade podem ser feitas com no maximo ${rules.max_advance_days} dia(s) de antecedencia.`)
        }
    }

    const requestedMinutes = toMinutes(normalizedTime)
    if (requestedMinutes === null) {
        throw new ReservationValidationError('Horario invalido.')
    }

    if (blocks.some((block) => isBlockedForTime(block, requestedMinutes))) {
        throw new ReservationValidationError('Esta data ou horario esta bloqueado para reservas.')
    }

    if (input.environmentId && !environment) {
        throw new ReservationValidationError('O ambiente selecionado nao esta disponivel nesta unidade.')
    }

    const environmentCapacity = getEnvironmentCapacity(environment)
    if (environmentCapacity !== null && pax > environmentCapacity) {
        throw new ReservationValidationError(`Esse ambiente comporta no maximo ${environmentCapacity} pessoa(s).`)
    }

    const reservedPaxForSlot = await fetchReservedPax(supabase, {
        unitId: input.unitId,
        date: input.date,
        time: normalizedTime,
        excludeReservationId: input.excludeReservationId,
    })

    if (reservedPaxForSlot + pax > slot.max_pax_per_slot) {
        throw new ReservationValidationError('Esse horario acabou de lotar. Escolha outro horario.')
    }

    if (input.environmentId && environmentCapacity !== null) {
        const reservedPaxForEnvironment = await fetchReservedPax(supabase, {
            unitId: input.unitId,
            date: input.date,
            time: normalizedTime,
            environmentId: input.environmentId,
            excludeReservationId: input.excludeReservationId,
        })

        if (reservedPaxForEnvironment + pax > environmentCapacity) {
            throw new ReservationValidationError('Esse ambiente nao tem mais disponibilidade para esse horario.')
        }
    }

    return {
        normalizedTime,
        slot,
        rules,
        environmentCapacity,
    }
}
