import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/types'
import {
    buildReservationLink,
    type ConversationMissingField,
    lookupAvailability,
    type ResolvedConversationUnit,
} from './availability-check'
import { stripBrandPrefix } from './brand'

export type ConversationMessageRole = 'customer' | 'assistant'

export interface ConversationMessage {
    role: ConversationMessageRole
    text: string
}

export interface ConversationAssistInput {
    customerName?: string | null
    unitId?: string | null
    unitSlug?: string | null
    unitName?: string | null
    reservationDate?: string | null
    reservationTime?: string | null
    pax?: number | null
    reservationLink?: string | null
    messages?: ConversationMessage[]
    messageHistoryText?: string | null
}

export interface ConversationAssistResult {
    intent: 'availability_check' | 'link_request' | 'general_support'
    action:
    | 'clarify_unit'
    | 'ask_missing_details'
    | 'send_reservation_link'
    | 'confirm_availability_and_send_link'
    | 'offer_alternative_times'
    | 'inform_unavailable'
    | 'continue_support'
    message: string
    reservationLink: string | null
    unit: ResolvedConversationUnit | null
    missingFields: ConversationMissingField[]
    extracted: {
        customerName: string
        reservationDate: string | null
        reservationTime: string | null
        pax: number | null
    }
    availability: {
        checked: boolean
        isAvailable: boolean | null
        reason: string | null
        operatingTimes: string[]
        availableTimes: string[]
    }
}

const CUSTOMER_PREFIX = /^(cliente|lead|contato|usuario|usu[aá]rio|pessoa)\s*:\s*/i
const ASSISTANT_PREFIX = /^(atendente|bot|assistente|equipe|vendedor|ia)\s*:\s*/i

const MONTH_MAP: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    março: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
}

function normalizeText(text: string) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

function parseHistoryText(historyText?: string | null) {
    if (!historyText) return []

    return historyText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map<ConversationMessage | null>((line) => {
            if (CUSTOMER_PREFIX.test(line)) {
                return { role: 'customer', text: line.replace(CUSTOMER_PREFIX, '').trim() }
            }

            if (ASSISTANT_PREFIX.test(line)) {
                return { role: 'assistant', text: line.replace(ASSISTANT_PREFIX, '').trim() }
            }

            return null
        })
        .filter((message): message is ConversationMessage => Boolean(message))
}

function formatDateLabel(date: string | null) {
    if (!date) return null
    const [year, month, day] = date.split('-')
    if (!year || !month || !day) return null
    return `${day}/${month}`
}

function formatUnitShortName(name?: string | null) {
    if (!name) return null
    return stripBrandPrefix(name) || name.trim()
}

function parseDateFromText(text: string, referenceDate = new Date()) {
    const normalized = normalizeText(text)

    const fullDateMatch = normalized.match(/\b(?:dia\s*)?(\d{1,2})\s*(?:de\s*)?(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*(\d{4}))?\b/)
    if (fullDateMatch) {
        const day = Number(fullDateMatch[1])
        const month = MONTH_MAP[fullDateMatch[2]]
        const year = Number(fullDateMatch[3] || referenceDate.getFullYear())

        if (month && day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
    }

    const compactDateMatch = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/)
    if (compactDateMatch) {
        const day = Number(compactDateMatch[1])
        const month = Number(compactDateMatch[2])
        const rawYear = compactDateMatch[3]
        const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : referenceDate.getFullYear()

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
    }

    const dayOnlyMatch = normalized.match(/\bdia\s*(\d{1,2})\b/)
    if (dayOnlyMatch) {
        const day = Number(dayOnlyMatch[1])
        const month = referenceDate.getMonth() + 1
        const year = referenceDate.getFullYear()

        if (day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
    }

    return null
}

function parseTimeFromText(text: string) {
    const normalized = normalizeText(text)
    const fullTimeMatch = normalized.match(/\b(?:as|às)?\s*(\d{1,2})[:h](\d{2})\b/)
    if (fullTimeMatch) {
        return `${String(Number(fullTimeMatch[1])).padStart(2, '0')}:${fullTimeMatch[2]}`
    }

    const hourOnlyMatch = normalized.match(/\b(?:as|às)?\s*(\d{1,2})h\b/)
    if (hourOnlyMatch) {
        return `${String(Number(hourOnlyMatch[1])).padStart(2, '0')}:00`
    }

    return null
}

function parsePaxFromText(text: string) {
    const normalized = normalizeText(text)

    if (/\bcasal\b/.test(normalized)) return 2

    const paxMatch = normalized.match(/\b(\d{1,2})\s*(pessoas?|adultos?|lugares?|reservas?)\b/)
    if (paxMatch) {
        return Number(paxMatch[1])
    }

    return null
}

async function inferUnitNameFromMessages(
    supabase: SupabaseClient<Database>,
    messages: ConversationMessage[]
) {
    const combinedText = messages.map(message => message.text).join(' ')
    if (!combinedText.trim()) return null

    const { data: units } = await supabase
        .from('units')
        .select('name, slug')
        .eq('is_active', true)

    const normalizedConversation = normalizeText(combinedText)
    const match = (units || []).find((unit) => (
        normalizedConversation.includes(normalizeText(unit.name))
        || normalizedConversation.includes(normalizeText(unit.slug))
        || normalizedConversation.includes(normalizeText(stripBrandPrefix(unit.name) || unit.name))
    ))

    return match?.name || null
}

function inferLatestValue<T>(
    explicitValue: T | null | undefined,
    messages: ConversationMessage[],
    extractor: (text: string) => T | null
) {
    if (explicitValue !== null && explicitValue !== undefined && explicitValue !== '') {
        return explicitValue
    }

    for (const message of [...messages].reverse()) {
        if (message.role !== 'customer') continue

        const value = extractor(message.text)
        if (value !== null && value !== undefined) {
            return value
        }
    }

    return null
}

function detectIntent(lastCustomerMessage: string | null) {
    if (!lastCustomerMessage) return 'general_support' as const

    const normalized = normalizeText(lastCustomerMessage)

    if (/(nao recebi o link|não recebi o link|cadê o link|cade o link|manda o link|me manda o link|reenvia o link|reenvie o link|qual o link)/.test(normalized)) {
        return 'link_request' as const
    }

    if (/(tem disponibilidade|tem vaga|disponibilidade|tem mesa|tem lugar|verifica|verificar)/.test(normalized)) {
        return 'availability_check' as const
    }

    return 'general_support' as const
}

function conversationHasBrokenPromise(messages: ConversationMessage[]) {
    const assistantTexts = messages.filter(message => message.role === 'assistant').map(message => normalizeText(message.text))
    const promisedLink = assistantTexts.some(text => /(vou verificar|vou te mandar o link|ja te mando o link|ja te envio o link|te mando o link|vou reenviar o link)/.test(text))
    const linkActuallySent = assistantTexts.some(text => /https?:\/\//.test(text))

    return promisedLink && !linkActuallySent
}

function sentenceList(items: string[]) {
    return items.join(', ')
}

function buildMissingDetailsMessage(params: {
    customerName: string
    unit: ResolvedConversationUnit | null
    reservationDate: string | null
    missingFields: ConversationMissingField[]
    reservationLink: string | null
    operatingTimes: string[]
    apologizeForBrokenPromise: boolean
}) {
    const shortUnitName = formatUnitShortName(params.unit?.name)
    const dateLabel = formatDateLabel(params.reservationDate)
    const intro = params.apologizeForBrokenPromise
        ? `${params.customerName}, foi mal pela confusao.`
        : `${params.customerName}, consigo te ajudar com isso.`

    const missingFieldLabels = params.missingFields
        .filter(field => field !== 'unit' && field !== 'date')
        .map((field) => field === 'pax' ? 'quantas pessoas' : 'o horario aproximado')

    const timesPreview = params.operatingTimes.length > 0
        ? ` Hoje os horarios operando${dateLabel ? ` em ${dateLabel}` : ''} sao ${sentenceList(params.operatingTimes.slice(0, 4))}${params.operatingTimes.length > 4 ? '...' : ''}.`
        : ''

    const linkLine = params.reservationLink
        ? ` Se preferir, ja pode abrir o link da${shortUnitName ? ` ${shortUnitName}` : ' reserva'} por aqui: ${params.reservationLink}`
        : ''

    return `${intro} Para eu te confirmar certinho${dateLabel ? ` no dia ${dateLabel}` : ''}, me fala ${missingFieldLabels.join(' e ')}.${timesPreview}${linkLine}`
}

function buildAvailableMessage(params: {
    customerName: string
    unit: ResolvedConversationUnit | null
    reservationDate: string | null
    reservationTime: string | null
    pax: number | null
    reservationLink: string | null
    apologizeForBrokenPromise: boolean
}) {
    const shortUnitName = formatUnitShortName(params.unit?.name)
    const dateLabel = formatDateLabel(params.reservationDate)
    const paxLabel = params.pax ? `${params.pax} ${params.pax === 1 ? 'pessoa' : 'pessoas'}` : null
    const intro = params.apologizeForBrokenPromise
        ? `${params.customerName}, foi mal pela demora.`
        : `${params.customerName}, consegui confirmar aqui.`

    const details = [
        dateLabel ? `para ${dateLabel}` : null,
        params.reservationTime ? `as ${params.reservationTime}` : null,
        paxLabel ? `para ${paxLabel}` : null,
        shortUnitName ? `na ${shortUnitName}` : null,
    ].filter(Boolean).join(' ')

    const linkLine = params.reservationLink ? ` Aqui esta o link para seguir: ${params.reservationLink}` : ''

    return `${intro}${details ? ` Tem disponibilidade ${details}.` : ' Tem disponibilidade.'}${linkLine}`
}

function buildAlternativeTimesMessage(params: {
    customerName: string
    unit: ResolvedConversationUnit | null
    reservationDate: string | null
    reservationTime: string | null
    reservationLink: string | null
    availableTimes: string[]
    reason: string | null
}) {
    const shortUnitName = formatUnitShortName(params.unit?.name)
    const dateLabel = formatDateLabel(params.reservationDate)
    const intro = `${params.customerName}, para ${dateLabel ? `${dateLabel}` : 'essa data'}`
    const timeLead = params.reservationTime ? ` as ${params.reservationTime}` : ''
    const availablePreview = sentenceList(params.availableTimes.slice(0, 4))
    const linkLine = params.reservationLink ? ` Se preferir, segue pelo link: ${params.reservationLink}` : ''

    return `${intro}${timeLead} eu nao consegui confirmar esse horario${shortUnitName ? ` na ${shortUnitName}` : ''}. Os melhores horarios abertos agora sao ${availablePreview}.${linkLine}${params.reason ? ` ${params.reason}` : ''}`
}

function buildUnavailableMessage(params: {
    customerName: string
    unit: ResolvedConversationUnit | null
    reservationDate: string | null
    reservationLink: string | null
    reason: string | null
}) {
    const shortUnitName = formatUnitShortName(params.unit?.name)
    const dateLabel = formatDateLabel(params.reservationDate)
    const linkLine = params.reservationLink ? ` Se quiser, eu te mando o link mesmo assim para voce tentar outra combinacao: ${params.reservationLink}` : ''

    return `${params.customerName}, no momento eu nao encontrei disponibilidade${shortUnitName ? ` na ${shortUnitName}` : ''}${dateLabel ? ` para ${dateLabel}` : ''}.${params.reason ? ` ${params.reason}` : ''}${linkLine}`
}

export async function assistConversation(
    supabase: SupabaseClient<Database>,
    input: ConversationAssistInput
): Promise<ConversationAssistResult> {
    const messages = [
        ...(input.messages || []),
        ...parseHistoryText(input.messageHistoryText),
    ]

    const customerName = (input.customerName?.trim() || 'Cliente')
    const lastCustomerMessage = [...messages].reverse().find(message => message.role === 'customer')?.text || null
    const intent = detectIntent(lastCustomerMessage)
    const brokenPromise = conversationHasBrokenPromise(messages)

    const inferredDate = inferLatestValue(input.reservationDate?.trim() || null, messages, (text) => parseDateFromText(text))
    const inferredTime = inferLatestValue(input.reservationTime?.trim() || null, messages, (text) => parseTimeFromText(text))
    const inferredPax = inferLatestValue(input.pax ?? null, messages, (text) => parsePaxFromText(text))
    const inferredUnitName = input.unitName?.trim() || await inferUnitNameFromMessages(supabase, messages)

    const availability = await lookupAvailability(supabase, {
        unitId: input.unitId,
        unitSlug: input.unitSlug,
        unitName: inferredUnitName,
        date: inferredDate,
        time: inferredTime,
        pax: inferredPax,
    })

    const reservationLink = input.reservationLink || availability.reservationLink || buildReservationLink(availability.unit?.slug)

    if (!availability.unit) {
        return {
            intent,
            action: 'clarify_unit',
            message: `${customerName}, me confirma so a unidade para eu te mandar o link certo e verificar isso da forma correta.`,
            reservationLink,
            unit: null,
            missingFields: ['unit', ...availability.missingFields.filter(field => field !== 'unit')],
            extracted: {
                customerName,
                reservationDate: availability.requestedDate,
                reservationTime: availability.requestedTime,
                pax: availability.requestedPax,
            },
            availability: {
                checked: false,
                isAvailable: null,
                reason: availability.reason,
                operatingTimes: availability.operatingTimes,
                availableTimes: availability.availableTimes,
            },
        }
    }

    if (intent === 'link_request') {
        if (availability.checked && availability.isAvailable === false && availability.availableTimes.length > 0) {
            return {
                intent,
                action: 'offer_alternative_times',
                message: buildAlternativeTimesMessage({
                    customerName,
                    unit: availability.unit,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    reservationLink,
                    availableTimes: availability.availableTimes,
                    reason: null,
                }),
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        const canConfirmAvailability = availability.checked && availability.isAvailable === true
        return {
            intent,
            action: canConfirmAvailability ? 'confirm_availability_and_send_link' : 'send_reservation_link',
            message: canConfirmAvailability
                ? buildAvailableMessage({
                    customerName,
                    unit: availability.unit,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                    reservationLink,
                    apologizeForBrokenPromise: true,
                })
                : `${customerName}, foi mal por isso. Aqui esta o link da ${formatUnitShortName(availability.unit.name) || availability.unit.name}: ${reservationLink}${availability.missingFields.length > 0 ? ' Se quiser, eu tambem confirmo por aqui assim que voce me passar horario e quantidade de pessoas.' : ''}`,
            reservationLink,
            unit: availability.unit,
            missingFields: availability.missingFields,
            extracted: {
                customerName,
                reservationDate: availability.requestedDate,
                reservationTime: availability.requestedTime,
                pax: availability.requestedPax,
            },
            availability: {
                checked: availability.checked,
                isAvailable: availability.isAvailable,
                reason: availability.reason,
                operatingTimes: availability.operatingTimes,
                availableTimes: availability.availableTimes,
            },
        }
    }

    if (intent === 'availability_check') {
        const onlyTimeMissing = availability.missingFields.length === 1 && availability.missingFields[0] === 'time'

        if (onlyTimeMissing && availability.checked && availability.availableTimes.length > 0) {
            return {
                intent,
                action: 'offer_alternative_times',
                message: `${customerName}, para ${formatDateLabel(availability.requestedDate)} eu encontrei horarios abertos na ${formatUnitShortName(availability.unit.name) || availability.unit.name}: ${sentenceList(availability.availableTimes.slice(0, 4))}. Se preferir, segue por aqui no link: ${reservationLink}`,
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        if (availability.checked && availability.isAvailable === false && availability.availableTimes.length === 0 && availability.missingFields.length === 0) {
            return {
                intent,
                action: 'inform_unavailable',
                message: buildUnavailableMessage({
                    customerName,
                    unit: availability.unit,
                    reservationDate: availability.requestedDate,
                    reservationLink,
                    reason: availability.reason,
                }),
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        if (availability.missingFields.length > 0) {
            return {
                intent,
                action: 'ask_missing_details',
                message: buildMissingDetailsMessage({
                    customerName,
                    unit: availability.unit,
                    reservationDate: availability.requestedDate,
                    missingFields: availability.missingFields,
                    reservationLink,
                    operatingTimes: availability.operatingTimes,
                    apologizeForBrokenPromise: brokenPromise,
                }),
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        if (availability.isAvailable === true) {
            const shouldSendAlternatives = !availability.requestedTime && availability.availableTimes.length > 0

            return {
                intent,
                action: shouldSendAlternatives ? 'offer_alternative_times' : 'confirm_availability_and_send_link',
                message: shouldSendAlternatives
                    ? `${customerName}, para ${formatDateLabel(availability.requestedDate)} eu encontrei horarios abertos na ${formatUnitShortName(availability.unit.name) || availability.unit.name}: ${sentenceList(availability.availableTimes.slice(0, 4))}. Se quiser, segue por aqui no link: ${reservationLink}`
                    : buildAvailableMessage({
                        customerName,
                        unit: availability.unit,
                        reservationDate: availability.requestedDate,
                        reservationTime: availability.requestedTime,
                        pax: availability.requestedPax,
                        reservationLink,
                        apologizeForBrokenPromise: brokenPromise,
                    }),
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        if (availability.availableTimes.length > 0) {
            return {
                intent,
                action: 'offer_alternative_times',
                message: buildAlternativeTimesMessage({
                    customerName,
                    unit: availability.unit,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    reservationLink,
                    availableTimes: availability.availableTimes,
                    reason: null,
                }),
                reservationLink,
                unit: availability.unit,
                missingFields: availability.missingFields,
                extracted: {
                    customerName,
                    reservationDate: availability.requestedDate,
                    reservationTime: availability.requestedTime,
                    pax: availability.requestedPax,
                },
                availability: {
                    checked: availability.checked,
                    isAvailable: availability.isAvailable,
                    reason: availability.reason,
                    operatingTimes: availability.operatingTimes,
                    availableTimes: availability.availableTimes,
                },
            }
        }

        return {
            intent,
            action: 'inform_unavailable',
            message: buildUnavailableMessage({
                customerName,
                unit: availability.unit,
                reservationDate: availability.requestedDate,
                reservationLink,
                reason: availability.reason,
            }),
            reservationLink,
            unit: availability.unit,
            missingFields: availability.missingFields,
            extracted: {
                customerName,
                reservationDate: availability.requestedDate,
                reservationTime: availability.requestedTime,
                pax: availability.requestedPax,
            },
            availability: {
                checked: availability.checked,
                isAvailable: availability.isAvailable,
                reason: availability.reason,
                operatingTimes: availability.operatingTimes,
                availableTimes: availability.availableTimes,
            },
        }
    }

    return {
        intent,
        action: 'continue_support',
        message: `${customerName}, continuo por aqui. Se quiser, eu te mando o link da ${formatUnitShortName(availability.unit.name) || availability.unit.name} e tambem posso confirmar horario e disponibilidade com mais precisao.`,
        reservationLink,
        unit: availability.unit,
        missingFields: availability.missingFields,
        extracted: {
            customerName,
            reservationDate: availability.requestedDate,
            reservationTime: availability.requestedTime,
            pax: availability.requestedPax,
        },
        availability: {
            checked: availability.checked,
            isAvailable: availability.isAvailable,
            reason: availability.reason,
            operatingTimes: availability.operatingTimes,
            availableTimes: availability.availableTimes,
        },
    }
}
