import type { SupabaseClient } from '@supabase/supabase-js'
import { ReservationValidationError, normalizeReservationTime, validateReservationRequest } from './reservation-validation'
import type { Database } from './supabase/types'
import { generateTimeSlots } from './utils'

type UnitRow = Database['public']['Tables']['units']['Row']
type TimeSlotRow = Database['public']['Tables']['time_slots']['Row']

export type ConversationMissingField = 'unit' | 'date' | 'time' | 'pax'

export interface ResolvedConversationUnit {
    id: string
    name: string
    slug: string
    address?: string | null
    phone?: string | null
}

export interface AvailabilityLookupInput {
    unitId?: string | null
    unitSlug?: string | null
    unitName?: string | null
    date?: string | null
    time?: string | null
    pax?: number | null
}

export interface AvailabilityLookupResult {
    unit: ResolvedConversationUnit | null
    reservationLink: string | null
    missingFields: ConversationMissingField[]
    operatingTimes: string[]
    availableTimes: string[]
    requestedDate: string | null
    requestedTime: string | null
    requestedPax: number | null
    checked: boolean
    isAvailable: boolean | null
    reason: string | null
}

const DEFAULT_APP_URL = 'https://fullhouseagendamento.vercel.app'

function normalizeText(text: string) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/^full\s*house\s+/i, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function uniqueSortedTimes(times: string[]) {
    return Array.from(new Set(times)).sort((left, right) => left.localeCompare(right))
}

function toResolvedUnit(unit: UnitRow | null): ResolvedConversationUnit | null {
    if (!unit) return null

    return {
        id: unit.id,
        name: unit.name,
        slug: unit.slug,
        address: unit.address,
        phone: unit.phone,
    }
}

export function buildReservationLink(unitSlug: string | null | undefined) {
    if (!unitSlug) return null

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
    return `${baseUrl.replace(/\/$/, '')}/reservar/${unitSlug}`
}

async function resolveUnitByHints(
    supabase: SupabaseClient<Database>,
    input: Pick<AvailabilityLookupInput, 'unitId' | 'unitSlug' | 'unitName'>
) {
    if (input.unitId) {
        const { data } = await supabase
            .from('units')
            .select('id, name, slug, address, phone, is_active, image_url, created_at')
            .eq('id', input.unitId)
            .eq('is_active', true)
            .maybeSingle()

        return toResolvedUnit(data || null)
    }

    if (input.unitSlug) {
        const { data } = await supabase
            .from('units')
            .select('id, name, slug, address, phone, is_active, image_url, created_at')
            .eq('slug', input.unitSlug)
            .eq('is_active', true)
            .maybeSingle()

        return toResolvedUnit(data || null)
    }

    if (!input.unitName) return null

    const normalizedHint = normalizeText(input.unitName)
    if (!normalizedHint) return null

    const { data } = await supabase
        .from('units')
        .select('id, name, slug, address, phone, is_active, image_url, created_at')
        .eq('is_active', true)

    const units = (data || []) as UnitRow[]

    const match = units.find((unit) => {
        const normalizedName = normalizeText(unit.name)
        const normalizedSlug = normalizeText(unit.slug)

        return normalizedName === normalizedHint
            || normalizedSlug === normalizedHint
            || normalizedName.includes(normalizedHint)
            || normalizedHint.includes(normalizedName)
    }) || null

    return toResolvedUnit(match)
}

function getDayOfWeek(date: string) {
    const requestedDate = new Date(`${date}T00:00:00-03:00`)
    if (Number.isNaN(requestedDate.getTime())) return null
    return requestedDate.getUTCDay()
}

async function fetchOperatingTimes(
    supabase: SupabaseClient<Database>,
    unitId: string,
    date: string
) {
    const dayOfWeek = getDayOfWeek(date)
    if (dayOfWeek === null) return []

    const { data } = await supabase
        .from('time_slots')
        .select('id, open_time, close_time, slot_interval_minutes, day_of_week, max_pax_per_slot, is_active, unit_id')
        .eq('unit_id', unitId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('open_time')

    const generatedTimes = ((data || []) as TimeSlotRow[]).flatMap((slot) => {
        return generateTimeSlots(slot.open_time, slot.close_time, slot.slot_interval_minutes || 30)
    })

    return uniqueSortedTimes(generatedTimes)
}

async function checkTimeAvailability(
    supabase: SupabaseClient<Database>,
    input: {
        unitId: string
        date: string
        time: string
        pax: number
    }
) {
    try {
        await validateReservationRequest(supabase, {
            unitId: input.unitId,
            date: input.date,
            time: input.time,
            pax: input.pax,
        })

        return { available: true, reason: null as string | null }
    } catch (error) {
        if (error instanceof ReservationValidationError) {
            return { available: false, reason: error.message }
        }

        throw error
    }
}

export async function lookupAvailability(
    supabase: SupabaseClient<Database>,
    input: AvailabilityLookupInput
): Promise<AvailabilityLookupResult> {
    const unit = await resolveUnitByHints(supabase, input)
    const requestedDate = input.date?.trim() || null
    const requestedTime = input.time ? normalizeReservationTime(input.time).slice(0, 5) : null
    const requestedPax = input.pax && Number.isFinite(Number(input.pax)) ? Math.floor(Number(input.pax)) : null
    const reservationLink = buildReservationLink(unit?.slug)

    const missingFields: ConversationMissingField[] = []
    if (!unit) missingFields.push('unit')
    if (!requestedDate) missingFields.push('date')

    if (missingFields.length > 0 || !unit || !requestedDate) {
        return {
            unit,
            reservationLink,
            missingFields,
            operatingTimes: [],
            availableTimes: [],
            requestedDate,
            requestedTime,
            requestedPax,
            checked: false,
            isAvailable: null,
            reason: !unit ? 'Nao consegui identificar a unidade da conversa.' : null,
        }
    }

    const operatingTimes = await fetchOperatingTimes(supabase, unit.id, requestedDate)

    if (operatingTimes.length === 0) {
        return {
            unit,
            reservationLink,
            missingFields: [],
            operatingTimes,
            availableTimes: [],
            requestedDate,
            requestedTime,
            requestedPax,
            checked: true,
            isAvailable: false,
            reason: 'Nao encontrei horarios operando para essa data.',
        }
    }

    if (!requestedPax) {
        return {
            unit,
            reservationLink,
            missingFields: requestedTime ? ['pax'] : ['pax', 'time'],
            operatingTimes,
            availableTimes: [],
            requestedDate,
            requestedTime,
            requestedPax,
            checked: false,
            isAvailable: null,
            reason: null,
        }
    }

    if (requestedTime) {
        const availability = await checkTimeAvailability(supabase, {
            unitId: unit.id,
            date: requestedDate,
            time: requestedTime,
            pax: requestedPax,
        })

        const availableTimes = availability.available
            ? [requestedTime]
            : await Promise.all(
                operatingTimes.map(async (candidateTime) => {
                    const candidateAvailability = await checkTimeAvailability(supabase, {
                        unitId: unit.id,
                        date: requestedDate,
                        time: candidateTime,
                        pax: requestedPax,
                    })

                    return candidateAvailability.available ? candidateTime : null
                })
            ).then((times) => times.filter((time): time is string => Boolean(time)))

        return {
            unit,
            reservationLink,
            missingFields: [],
            operatingTimes,
            availableTimes,
            requestedDate,
            requestedTime,
            requestedPax,
            checked: true,
            isAvailable: availability.available,
            reason: availability.reason,
        }
    }

    const availableTimes = (await Promise.all(
        operatingTimes.map(async (candidateTime) => {
            const availability = await checkTimeAvailability(supabase, {
                unitId: unit.id,
                date: requestedDate,
                time: candidateTime,
                pax: requestedPax,
            })

            return availability.available ? candidateTime : null
        })
    )).filter((time): time is string => Boolean(time))

    return {
        unit,
        reservationLink,
        missingFields: ['time'],
        operatingTimes,
        availableTimes,
        requestedDate,
        requestedTime: null,
        requestedPax,
        checked: true,
        isAvailable: availableTimes.length > 0,
        reason: availableTimes.length > 0 ? null : 'Nao encontrei horario disponivel para essa data.',
    }
}
