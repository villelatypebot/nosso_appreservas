import { createClient } from '@supabase/supabase-js'

const baseUrl = (process.env.SMOKE_TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const overrideUnitId = process.env.SMOKE_TEST_UNIT_ID || null
const overrideUnitSlug = process.env.SMOKE_TEST_UNIT_SLUG || null
const overrideDate = process.env.SMOKE_TEST_DATE || null
const overrideTime = process.env.SMOKE_TEST_TIME || null
const overrideUpdatedTime = process.env.SMOKE_TEST_UPDATED_TIME || null
const overridePax = process.env.SMOKE_TEST_PAX ? Number(process.env.SMOKE_TEST_PAX) : null
const overrideUpdatedPax = process.env.SMOKE_TEST_UPDATED_PAX ? Number(process.env.SMOKE_TEST_UPDATED_PAX) : null
const shouldRunPushTest = process.env.SMOKE_TEST_PUSH === '1'

function assert(condition, message) {
    if (!condition) {
        throw new Error(message)
    }
}

function toIsoDate(date) {
    return date.toISOString().split('T')[0]
}

function parseTimeToMinutes(value) {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
}

function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function nextDateForDay(dayOfWeek, startDate = new Date()) {
    const base = new Date(startDate)
    base.setHours(0, 0, 0, 0)

    for (let i = 1; i <= 45; i += 1) {
        const candidate = new Date(base)
        candidate.setDate(candidate.getDate() + i)
        if (candidate.getDay() === dayOfWeek) {
            return toIsoDate(candidate)
        }
    }

    throw new Error('Não foi possível encontrar uma data futura compatível com os horários configurados.')
}

async function requestJson(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {}),
        },
    })

    const text = await response.text()
    let json = null

    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = { raw: text }
    }

    return { response, json }
}

async function resolveTestContext(supabase) {
    let unitQuery = supabase.from('units').select('id, name, slug').eq('is_active', true)

    if (overrideUnitId) {
        unitQuery = unitQuery.eq('id', overrideUnitId)
    } else if (overrideUnitSlug) {
        unitQuery = unitQuery.eq('slug', overrideUnitSlug)
    } else {
        unitQuery = unitQuery.order('created_at', { ascending: true }).limit(1)
    }

    const { data: unit, error: unitError } = await unitQuery.maybeSingle()
    assert(!unitError && unit, 'Nenhum estabelecimento ativo foi encontrado. Conclua o setup inicial antes do smoke test.')

    const [{ data: slotRows, error: slotError }, { data: rules, error: rulesError }] = await Promise.all([
        supabase
            .from('time_slots')
            .select('day_of_week, open_time, close_time, slot_interval_minutes, max_pax_per_slot')
            .eq('unit_id', unit.id)
            .eq('is_active', true)
            .order('day_of_week', { ascending: true }),
        supabase
            .from('reservation_rules')
            .select('min_pax, max_pax')
            .eq('unit_id', unit.id)
            .maybeSingle(),
    ])

    assert(!slotError && slotRows?.length, `Configure ao menos um horário ativo no estabelecimento "${unit.name}" antes do smoke test.`)
    assert(!rulesError && rules, `Configure as regras de reserva do estabelecimento "${unit.name}" antes do smoke test.`)

    const slot = slotRows[0]
    const reservationDate = overrideDate || nextDateForDay(slot.day_of_week)
    const initialTime = overrideTime || String(slot.open_time).slice(0, 5)

    const interval = Number(slot.slot_interval_minutes || 30)
    const nextMinutes = parseTimeToMinutes(initialTime) + interval
    const closeMinutes = parseTimeToMinutes(String(slot.close_time).slice(0, 5))
    const updatedTime = overrideUpdatedTime || (nextMinutes < closeMinutes ? formatMinutes(nextMinutes) : initialTime)

    const minPax = Math.max(1, Number(rules.min_pax || 1))
    const maxPax = Math.max(minPax, Math.min(Number(rules.max_pax || 20), Number(slot.max_pax_per_slot || 20)))
    const initialPax = overridePax || Math.min(Math.max(minPax, 3), maxPax)
    const updatedPax = overrideUpdatedPax || Math.min(maxPax, initialPax + 1)

    return {
        unit,
        reservationDate,
        initialTime,
        updatedTime,
        initialPax,
        updatedPax,
    }
}

async function main() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    assert(serviceRoleKey && supabaseUrl, 'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o smoke test.')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const context = await resolveTestContext(supabase)
    const testPhone = `2199${Date.now().toString().slice(-7)}`
    const testName = 'Smoke Test Whitelabel'

    async function cleanup() {
        const { data: customers } = await supabase.from('customers').select('id').eq('phone', testPhone)
        const customerIds = (customers || []).map((customer) => customer.id)

        if (customerIds.length > 0) {
            await supabase.from('reservations').delete().in('customer_id', customerIds)
            await supabase.from('customers').delete().in('id', customerIds)
        }
    }

    const results = []

    try {
        await cleanup()

        const availability = await requestJson('/api/availability/check', {
            method: 'POST',
            body: JSON.stringify({
                unitSlug: context.unit.slug,
                date: context.reservationDate,
                time: context.initialTime,
                pax: context.initialPax,
            }),
        })
        assert(availability.response.ok, 'availability/check falhou')
        assert(availability.json?.isAvailable === true, 'availability/check não confirmou disponibilidade')
        results.push(['availability', availability.json])

        const assistMissingUnit = await requestJson('/api/conversation/assist', {
            method: 'POST',
            body: JSON.stringify({
                customerName: 'Lucas',
                messageHistoryText: 'CLIENTE: tem disponibilidade no dia 30 para 4 pessoas?',
            }),
        })
        assert(assistMissingUnit.response.ok, 'conversation/assist (clarify unit) falhou')
        assert(assistMissingUnit.json?.action === 'clarify_unit', 'conversation/assist não pediu unidade quando ela faltava')
        results.push(['assist_missing_unit', assistMissingUnit.json])

        const assistLink = await requestJson('/api/conversation/assist', {
            method: 'POST',
            body: JSON.stringify({
                customerName: 'Lucas',
                unitSlug: context.unit.slug,
                reservationDate: context.reservationDate,
                pax: context.initialPax,
                messageHistoryText: 'CLIENTE: nao recebi o link',
            }),
        })
        assert(assistLink.response.ok, 'conversation/assist (reenvio de link) falhou')
        assert(
            typeof assistLink.json?.reservationLink === 'string'
            && assistLink.json.reservationLink.includes(`/reservar/${context.unit.slug}`),
            'conversation/assist não devolveu o link esperado'
        )
        results.push(['assist_link', assistLink.json])

        const createReservation = await requestJson('/api/reservations', {
            method: 'POST',
            body: JSON.stringify({
                unitId: context.unit.id,
                pax: context.initialPax,
                date: context.reservationDate,
                time: context.initialTime,
                name: testName,
                phone: testPhone,
                notes: 'SMOKE TEST AUTOMATICO',
                occasion: 'teste',
            }),
        })
        assert(createReservation.response.status === 201, 'POST /api/reservations não criou a reserva')
        const confirmationCode = createReservation.json?.confirmation_code
        assert(typeof confirmationCode === 'string' && confirmationCode.length > 0, 'Reserva criada sem confirmation_code')
        results.push(['reservation_create', createReservation.json])

        const weeklyCheck = await requestJson(`/api/reservations/weekly-check?phone=${encodeURIComponent(testPhone)}&date=${context.reservationDate}`)
        assert(weeklyCheck.response.ok, 'weekly-check falhou')
        assert(weeklyCheck.json?.hasReservation === true, 'weekly-check não encontrou a reserva da mesma semana')
        results.push(['weekly_check', weeklyCheck.json])

        const findByCode = await requestJson(`/api/client-reservation?code=${encodeURIComponent(confirmationCode)}`)
        assert(findByCode.response.ok, 'GET /api/client-reservation não encontrou a reserva')
        assert(findByCode.json?.reservation?.confirmation_code === confirmationCode, 'GET /api/client-reservation retornou outra reserva')
        results.push(['client_reservation_get', findByCode.json])

        const updateReservation = await requestJson('/api/client-reservation', {
            method: 'PATCH',
            body: JSON.stringify({
                code: confirmationCode,
                updates: {
                    time: context.updatedTime,
                    pax: context.updatedPax,
                },
            }),
        })
        assert(updateReservation.response.ok, 'PATCH /api/client-reservation falhou')
        assert(String(updateReservation.json?.reservation?.reservation_time || '').startsWith(context.updatedTime), 'PATCH /api/client-reservation não atualizou o horário')
        results.push(['client_reservation_patch', updateReservation.json])

        const searchReservations = await requestJson(`/api/reservations?unitId=${encodeURIComponent(context.unit.id)}&search=${encodeURIComponent(confirmationCode)}`)
        assert(searchReservations.response.ok, 'GET /api/reservations com busca falhou')
        const matchingCodes = (searchReservations.json?.data || []).map((reservation) => reservation.confirmation_code)
        assert(matchingCodes.includes(confirmationCode), 'A busca por confirmation_code não retornou a reserva criada no teste')
        results.push(['reservations_search', { total: searchReservations.json?.total, matchingCodes }])

        if (shouldRunPushTest) {
            results.push(['push_test', { skipped: true, reason: 'Agora o teste de push exige sessão administrativa autenticada. Use o botão "Testar push" no admin.' }])
        }
    } finally {
        await cleanup()
    }

    console.log(JSON.stringify({
        ok: true,
        baseUrl,
        context,
        results,
    }, null, 2))
}

main().catch((error) => {
    console.error(JSON.stringify({
        ok: false,
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
    }, null, 2))
    process.exit(1)
})
