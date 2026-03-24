import { createClient } from '@supabase/supabase-js'

const baseUrl = (process.env.SMOKE_TEST_BASE_URL || 'http://localhost:3002').replace(/\/$/, '')
const unitId = process.env.SMOKE_TEST_UNIT_ID || 'c1750f58-edb4-4fc8-9bd4-7d53f8fa69b2'
const unitSlug = process.env.SMOKE_TEST_UNIT_SLUG || 'boa-vista'
const reservationDate = process.env.SMOKE_TEST_DATE || '2026-03-29'
const initialTime = process.env.SMOKE_TEST_TIME || '19:00'
const updatedTime = process.env.SMOKE_TEST_UPDATED_TIME || '19:30'
const initialPax = Number(process.env.SMOKE_TEST_PAX || '3')
const updatedPax = Number(process.env.SMOKE_TEST_UPDATED_PAX || '4')
const shouldRunPushTest = process.env.SMOKE_TEST_PUSH !== '0'

function assert(condition, message) {
    if (!condition) {
        throw new Error(message)
    }
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

async function main() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    assert(serviceRoleKey && supabaseUrl, 'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o smoke test.')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const testPhone = `2199${Date.now().toString().slice(-7)}`
    const testName = 'Smoke Test Full House'

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
            body: JSON.stringify({ unitSlug, date: reservationDate, time: initialTime, pax: initialPax }),
        })
        assert(availability.response.ok, 'availability/check falhou')
        assert(availability.json?.isAvailable === true, 'availability/check nao confirmou disponibilidade')
        results.push(['availability', availability.json])

        const assistMissingUnit = await requestJson('/api/conversation/assist', {
            method: 'POST',
            body: JSON.stringify({
                customerName: 'Lucas',
                messageHistoryText: 'CLIENTE: tem disponibilidade no dia 30 para 4 pessoas?',
            }),
        })
        assert(assistMissingUnit.response.ok, 'conversation/assist (clarify unit) falhou')
        assert(assistMissingUnit.json?.action === 'clarify_unit', 'conversation/assist nao pediu unidade quando ela faltava')
        results.push(['assist_missing_unit', assistMissingUnit.json])

        const assistLink = await requestJson('/api/conversation/assist', {
            method: 'POST',
            body: JSON.stringify({
                customerName: 'Lucas',
                unitSlug,
                messageHistoryText: 'CLIENTE: nao recebi o link',
            }),
        })
        assert(assistLink.response.ok, 'conversation/assist (reenvio de link) falhou')
        assert(typeof assistLink.json?.reservationLink === 'string' && assistLink.json.reservationLink.includes(`/reservar/${unitSlug}`), 'conversation/assist nao devolveu o link esperado')
        results.push(['assist_link', assistLink.json])

        const createReservation = await requestJson('/api/reservations', {
            method: 'POST',
            body: JSON.stringify({
                unitId,
                pax: initialPax,
                date: reservationDate,
                time: initialTime,
                name: testName,
                phone: testPhone,
                notes: 'SMOKE TEST AUTOMATICO',
                occasion: 'teste',
            }),
        })
        assert(createReservation.response.status === 201, 'POST /api/reservations nao criou a reserva')
        const confirmationCode = createReservation.json?.confirmation_code
        assert(typeof confirmationCode === 'string' && confirmationCode.length > 0, 'Reserva criada sem confirmation_code')
        results.push(['reservation_create', createReservation.json])

        const weeklyCheck = await requestJson(`/api/reservations/weekly-check?phone=${encodeURIComponent(testPhone)}&date=${reservationDate}`)
        assert(weeklyCheck.response.ok, 'weekly-check falhou')
        assert(weeklyCheck.json?.hasReservation === true, 'weekly-check nao encontrou a reserva da mesma semana')
        results.push(['weekly_check', weeklyCheck.json])

        const findByCode = await requestJson(`/api/client-reservation?code=${encodeURIComponent(confirmationCode)}`)
        assert(findByCode.response.ok, 'GET /api/client-reservation nao encontrou a reserva')
        assert(findByCode.json?.reservation?.confirmation_code === confirmationCode, 'GET /api/client-reservation retornou outra reserva')
        results.push(['client_reservation_get', findByCode.json])

        const updateReservation = await requestJson('/api/client-reservation', {
            method: 'PATCH',
            body: JSON.stringify({
                code: confirmationCode,
                updates: {
                    time: updatedTime,
                    pax: updatedPax,
                },
            }),
        })
        assert(updateReservation.response.ok, 'PATCH /api/client-reservation falhou')
        assert(String(updateReservation.json?.reservation?.reservation_time || '').startsWith(updatedTime), 'PATCH /api/client-reservation nao atualizou o horario')
        results.push(['client_reservation_patch', updateReservation.json])

        const searchReservations = await requestJson(`/api/reservations?unitId=${encodeURIComponent(unitId)}&search=${encodeURIComponent(confirmationCode)}`)
        assert(searchReservations.response.ok, 'GET /api/reservations com busca falhou')
        const matchingCodes = (searchReservations.json?.data || []).map((reservation) => reservation.confirmation_code)
        assert(matchingCodes.includes(confirmationCode), 'A busca por confirmation_code nao retornou a reserva criada no teste')
        results.push(['reservations_search', { total: searchReservations.json?.total, matchingCodes }])

        if (shouldRunPushTest) {
            const pushTest = await requestJson('/api/push/test', { method: 'POST' })
            assert(pushTest.response.ok, 'POST /api/push/test falhou')
            assert(typeof pushTest.json?.sent === 'number', 'POST /api/push/test nao retornou estatisticas')
            results.push(['push_test', pushTest.json])
        }
    } finally {
        await cleanup()
    }

    console.log(JSON.stringify({
        ok: true,
        baseUrl,
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
