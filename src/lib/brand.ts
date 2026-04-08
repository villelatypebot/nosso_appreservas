import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/types'

type BusinessSettingsRow = Database['public']['Tables']['business_settings']['Row']

export interface BrandSettings {
    brandName: string
    shortName: string
    tagline: string
    description: string
    supportPhone: string | null
    supportEmail: string | null
    whatsappPhone: string | null
    logoUrl: string | null
    primaryColor: string
    secondaryColor: string
    reservationCodePrefix: string
}

function truthyFlag(value: string | undefined, fallback = false) {
    if (value === undefined) return fallback
    return value === 'true'
}

export const runtimeFlags = {
    adminFreeAccess: truthyFlag(process.env.NEXT_PUBLIC_ADMIN_ALLOW_FREE_ACCESS, false),
    setupEnabled: truthyFlag(process.env.NEXT_PUBLIC_SETUP_ENABLED, true),
}

export const defaultBrandSettings: BrandSettings = {
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Full House',
    shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME || 'Full House',
    tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'Sistema de reservas profissional e replicável',
    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || 'Gerencie reservas, unidades, horários, clientes e integrações em um único painel.',
    supportPhone: process.env.NEXT_PUBLIC_BRAND_SUPPORT_PHONE || null,
    supportEmail: process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL || null,
    whatsappPhone: process.env.NEXT_PUBLIC_BRAND_WHATSAPP_PHONE || null,
    logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || null,
    primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#F47920',
    secondaryColor: process.env.NEXT_PUBLIC_BRAND_SECONDARY_COLOR || '#C45E0A',
    reservationCodePrefix: (process.env.NEXT_PUBLIC_RESERVATION_CODE_PREFIX || 'FH').toUpperCase(),
}

export function getBrandInitials(value = defaultBrandSettings.shortName) {
    const words = value
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 2)

    if (words.length === 0) return 'RS'

    return words.map((word) => word[0]?.toUpperCase() || '').join('').slice(0, 2)
}

export function mergeBrandSettings(row?: Partial<BusinessSettingsRow> | null): BrandSettings {
    return {
        brandName: row?.brand_name || defaultBrandSettings.brandName,
        shortName: row?.short_name || defaultBrandSettings.shortName,
        tagline: row?.tagline || defaultBrandSettings.tagline,
        description: row?.description || defaultBrandSettings.description,
        supportPhone: row?.support_phone || defaultBrandSettings.supportPhone,
        supportEmail: row?.support_email || defaultBrandSettings.supportEmail,
        whatsappPhone: row?.whatsapp_phone || defaultBrandSettings.whatsappPhone,
        logoUrl: row?.logo_url || defaultBrandSettings.logoUrl,
        primaryColor: row?.primary_color || defaultBrandSettings.primaryColor,
        secondaryColor: row?.secondary_color || defaultBrandSettings.secondaryColor,
        reservationCodePrefix: (row?.reservation_code_prefix || defaultBrandSettings.reservationCodePrefix).toUpperCase(),
    }
}

export async function getBrandSettings(
    supabase: SupabaseClient<Database>
): Promise<BrandSettings> {
    const { data } = await supabase
        .from('business_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    return mergeBrandSettings(data)
}

export function stripBrandPrefix(unitName: string | null | undefined, brandName = defaultBrandSettings.brandName) {
    if (!unitName) return null

    const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const normalized = unitName.replace(new RegExp(`^${escapedBrand}\\s+`, 'i'), '').trim()

    return normalized || unitName.trim()
}
