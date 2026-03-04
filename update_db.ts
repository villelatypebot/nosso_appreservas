import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const unitsToUpdate = [
    {
        slug: 'boa-vista',
        address: 'Av. Gov. Macedo Soares, 795 - Boa Vista, São Gonçalo - RJ, 24436-225',
        phone: '(21) 96556-5686',
    },
    {
        slug: 'colubande',
        address: 'Av. Jorn. Roberto Marinho, 1320 - Colubandê, São Gonçalo - RJ, 24451-715',
        phone: '(21) 96556-5686',
    },
    {
        slug: 'araruama',
        address: 'R. Equador, 30 - Parque Hotel, Araruama - RJ, 28981-490',
        phone: '(21) 96556-5686',
    },
    {
        slug: 'niteroi',
        address: 'R. Noronha Torrezão, 165 - Santa Rosa, Niterói - RJ, 24240-185',
        phone: '(21) 96556-5686',
    },
]

async function updateUnits() {
    for (const u of unitsToUpdate) {
        const { error } = await supabase
            .from('units')
            .update({ address: u.address, phone: u.phone })
            .eq('slug', u.slug)

        if (error) {
            console.error(`Error updating ${u.slug}:`, error)
        } else {
            console.log(`Updated ${u.slug} successfully.`)
        }
    }
}

updateUnits()
