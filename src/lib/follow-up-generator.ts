export type FollowUpMessageRole = 'customer' | 'assistant'

export interface FollowUpMessage {
    role: FollowUpMessageRole
    text: string
}

export interface FollowUpGenerationInput {
    customerName: string
    unitName?: string | null
    reservationDate?: string | null
    pax?: number | null
    reservationLink?: string | null
    goal?: 'auto' | 'reply' | 'clear_doubt' | 'reserve'
    availabilityHint?: 'auto' | 'normal' | 'fast_filling'
    messages?: FollowUpMessage[]
    messageHistoryText?: string | null
}

export interface FollowUpSuggestion {
    strategy: string
    title: string
    message: string
}

export interface FollowUpGenerationResult {
    summary: string
    contextHint: string | null
    detectedGoal: 'reply' | 'clear_doubt' | 'reserve'
    suggestions: FollowUpSuggestion[]
}

type StrategyDefinition = {
    strategy: string
    title: string
    build: (context: ResolvedContext) => string | null
}

type ResolvedContext = {
    customerName: string
    shortUnitName: string | null
    lastCustomerMessage: string | null
    lastAssistantMessages: string[]
    contextHint: string | null
    goal: 'reply' | 'clear_doubt' | 'reserve'
    dateLabel: string | null
    paxLabel: string | null
    reservationLink: string | null
    availabilityHint: 'normal' | 'fast_filling'
}

const CUSTOMER_PREFIX = /^(cliente|lead|contato|usuario|usu[aá]rio|pessoa)\s*:\s*/i
const ASSISTANT_PREFIX = /^(atendente|bot|assistente|equipe|vendedor|ia)\s*:\s*/i

const TOPIC_PATTERNS: Array<{ pattern: RegExp; label: string; goal?: 'reply' | 'clear_doubt' | 'reserve' }> = [
    { pattern: /(bari[aá]tric|desconto|promo[cç][aã]o|valor|pre[cç]o|rod[ií]zio)/i, label: 'sobre o desconto ou valor', goal: 'clear_doubt' },
    { pattern: /(vaga|dispon[ií]vel|disponibilidade|lotad|tem mesa|tem lugar)/i, label: 'sobre a disponibilidade', goal: 'reserve' },
    { pattern: /(data|dia|quando|sexta|s[aá]bado|sabado|domingo|hor[aá]rio|hora)/i, label: 'sobre a data ou horario', goal: 'reserve' },
    { pattern: /(link|reserv|fechar|garantir|agendar)/i, label: 'sobre a reserva', goal: 'reserve' },
    { pattern: /(crian[cç]a|anivers[aá]rio|casal|fam[ií]lia|grupo|pessoa)/i, label: 'sobre a reserva', goal: 'reply' },
]

function stripAccents(text: string) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeForComparison(text: string) {
    return stripAccents(text)
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function similarity(a: string, b: string) {
    const aTokens = new Set(normalizeForComparison(a).split(' ').filter(Boolean))
    const bTokens = new Set(normalizeForComparison(b).split(' ').filter(Boolean))

    if (aTokens.size === 0 || bTokens.size === 0) return 0

    let intersection = 0
    aTokens.forEach(token => {
        if (bTokens.has(token)) intersection += 1
    })

    const union = new Set([...aTokens, ...bTokens]).size
    return union === 0 ? 0 : intersection / union
}

function isTooSimilar(candidate: string, previousMessages: string[]) {
    const normalizedCandidate = normalizeForComparison(candidate)

    return previousMessages.some(previous => {
        const normalizedPrevious = normalizeForComparison(previous)
        if (!normalizedPrevious) return false

        return normalizedCandidate === normalizedPrevious
            || normalizedCandidate.includes(normalizedPrevious)
            || normalizedPrevious.includes(normalizedCandidate)
            || similarity(candidate, previous) >= 0.72
    })
}

function parseHistoryText(historyText?: string | null) {
    if (!historyText) return []

    return historyText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map<FollowUpMessage | null>((line) => {
            if (CUSTOMER_PREFIX.test(line)) {
                return { role: 'customer', text: line.replace(CUSTOMER_PREFIX, '').trim() }
            }

            if (ASSISTANT_PREFIX.test(line)) {
                return { role: 'assistant', text: line.replace(ASSISTANT_PREFIX, '').trim() }
            }

            return null
        })
        .filter((message): message is FollowUpMessage => Boolean(message))
}

function formatDateLabel(date?: string | null) {
    if (!date) return null

    const parts = date.split('-')
    if (parts.length !== 3) return null

    return `${parts[2]}/${parts[1]}`
}

function formatUnitName(unitName?: string | null) {
    if (!unitName) return null

    const shortName = unitName.replace(/^full\s*house\s+/i, '').trim()
    return shortName || unitName.trim()
}

function sentenceCase(text: string | null) {
    if (!text) return null
    return text.charAt(0).toLowerCase() + text.slice(1)
}

function extractContextHint(lastCustomerMessage: string | null, reservationDate?: string | null) {
    if (lastCustomerMessage) {
        const match = TOPIC_PATTERNS.find(({ pattern }) => pattern.test(lastCustomerMessage))
        if (match) {
            return match.label
        }
    }

    const dateLabel = formatDateLabel(reservationDate)
    if (dateLabel) {
        return `sobre a reserva para ${dateLabel}`
    }

    return null
}

function inferGoal(
    explicitGoal: FollowUpGenerationInput['goal'],
    lastCustomerMessage: string | null,
    reservationLink?: string | null
): 'reply' | 'clear_doubt' | 'reserve' {
    if (explicitGoal && explicitGoal !== 'auto') {
        return explicitGoal
    }

    if (lastCustomerMessage) {
        const matchedTopic = TOPIC_PATTERNS.find(({ pattern }) => pattern.test(lastCustomerMessage))
        if (matchedTopic?.goal) {
            return matchedTopic.goal
        }

        if (lastCustomerMessage.includes('?')) {
            return 'clear_doubt'
        }
    }

    if (reservationLink) {
        return 'reserve'
    }

    return 'reply'
}

function buildSummary(contextHint: string | null, goal: ResolvedContext['goal']) {
    const goalLabelMap = {
        reply: 'retomar a conversa sem soar repetitivo',
        clear_doubt: 'tirar a duvida e conduzir para o proximo passo',
        reserve: 'levar a pessoa para concluir a reserva',
    } satisfies Record<ResolvedContext['goal'], string>

    if (!contextHint) {
        return `Objetivo identificado: ${goalLabelMap[goal]}.`
    }

    return `Ultimo contexto relevante: ${contextHint}. Objetivo identificado: ${goalLabelMap[goal]}.`
}

function maybeAppendLink(message: string, reservationLink: string | null) {
    if (!reservationLink) return message
    return `${message} ${reservationLink}`
}

function buildStrategies(context: ResolvedContext): StrategyDefinition[] {
    const contextLead = sentenceCase(context.contextHint)
    const dateLead = context.dateLabel ? ` para ${context.dateLabel}` : ''
    const unitLead = context.shortUnitName ? ` no ${context.shortUnitName}` : ''
    const paxLead = context.paxLabel ? ` para ${context.paxLabel}` : ''

    return [
        {
            strategy: 'contextual_consultative',
            title: 'Retomada consultiva',
            build: () => {
                const opening = contextLead
                    ? `${context.customerName}, ficou em aberto aqui ${contextLead}.`
                    : `${context.customerName}, fiquei com seu atendimento em aberto aqui.`

                const closing = context.goal === 'reserve'
                    ? ` Se quiser, eu te ajudo a avancar com a reserva${dateLead}${paxLead}.`
                    : ' Se quiser, eu continuo daqui com voce e te ajudo sem complicacao.'

                return `${opening}${closing}`
            },
        },
        {
            strategy: 'helpful_next_step',
            title: 'Ajuda objetiva',
            build: () => {
                if (context.goal === 'clear_doubt') {
                    return `${context.customerName}, se sua duvida ainda for essa, eu posso te responder de forma direta e ja te mostrar o melhor proximo passo.`
                }

                return maybeAppendLink(
                    `${context.customerName}, se fizer sentido, eu posso te mandar o link certo para reservar${unitLead}${dateLead}.`,
                    context.reservationLink
                )
            },
        },
        {
            strategy: 'soft_urgency',
            title: 'Urgencia leve',
            build: () => {
                if (context.availabilityHint !== 'fast_filling' && context.goal === 'reply') {
                    return null
                }

                return `${context.customerName}, te aviso porque as vagas costumam girar rapido${unitLead}. Se ainda quiser seguir com isso, eu posso te ajudar agora.`
            },
        },
        {
            strategy: 'reopen_with_context',
            title: 'Reabertura com contexto',
            build: () => {
                if (!context.lastCustomerMessage) {
                    return `${context.customerName}, continuo por aqui caso ainda queira ajuda para reservar${unitLead}.`
                }

                return `${context.customerName}, so retomando nossa conversa${contextLead ? ` ${contextLead}` : ''}. Se ainda fizer sentido para voce, eu sigo daqui com voce.`
            },
        },
        {
            strategy: 'direct_close',
            title: 'Fechamento simples',
            build: () => {
                if (context.goal !== 'reserve') {
                    return `${context.customerName}, ainda posso te ajudar?`
                }

                return maybeAppendLink(
                    `${context.customerName}, se voce quiser, eu facilito isso agora e te deixo no caminho mais rapido para reservar${dateLead}${paxLead}.`,
                    context.reservationLink
                )
            },
        },
    ]
}

function dedupeSuggestions(
    strategies: StrategyDefinition[],
    context: ResolvedContext
) {
    const suggestions: FollowUpSuggestion[] = []

    strategies.forEach((strategy) => {
        const message = strategy.build(context)
        if (!message) return

        if (isTooSimilar(message, [
            ...context.lastAssistantMessages,
            ...suggestions.map(suggestion => suggestion.message),
        ])) {
            return
        }

        suggestions.push({
            strategy: strategy.strategy,
            title: strategy.title,
            message,
        })
    })

    return suggestions.slice(0, 3)
}

export function generateFollowUpSuggestions(input: FollowUpGenerationInput): FollowUpGenerationResult {
    const parsedMessages = [
        ...(input.messages || []),
        ...parseHistoryText(input.messageHistoryText),
    ]

    const customerName = input.customerName.trim() || 'Cliente'
    const lastCustomerMessage = [...parsedMessages].reverse().find(message => message.role === 'customer')?.text || null
    const lastAssistantMessages = [...parsedMessages]
        .reverse()
        .filter(message => message.role === 'assistant')
        .slice(0, 3)
        .map(message => message.text)

    const goal = inferGoal(input.goal, lastCustomerMessage, input.reservationLink)
    const contextHint = extractContextHint(lastCustomerMessage, input.reservationDate)

    const context: ResolvedContext = {
        customerName,
        shortUnitName: formatUnitName(input.unitName),
        lastCustomerMessage,
        lastAssistantMessages,
        contextHint,
        goal,
        dateLabel: formatDateLabel(input.reservationDate),
        paxLabel: input.pax ? `${input.pax} ${input.pax === 1 ? 'pessoa' : 'pessoas'}` : null,
        reservationLink: input.reservationLink?.trim() || null,
        availabilityHint: input.availabilityHint === 'fast_filling' ? 'fast_filling' : 'normal',
    }

    const suggestions = dedupeSuggestions(buildStrategies(context), context)

    const fallbackMessage = context.goal === 'reserve'
        ? maybeAppendLink(
            `${context.customerName}, se ainda quiser reservar${context.shortUnitName ? ` no ${context.shortUnitName}` : ''}, eu posso te ajudar por aqui.`,
            context.reservationLink
        )
        : `${context.customerName}, continuo por aqui caso ainda queira ajuda.`

    return {
        summary: buildSummary(contextHint, goal),
        contextHint,
        detectedGoal: goal,
        suggestions: suggestions.length > 0
            ? suggestions
            : [{
                strategy: 'fallback',
                title: 'Retomada simples',
                message: fallbackMessage,
            }],
    }
}
