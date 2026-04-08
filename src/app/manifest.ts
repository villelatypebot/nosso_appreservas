import type { MetadataRoute } from 'next'
import { getBrandSettings } from '@/lib/brand'
import { createAdminClient } from '@/lib/platform'

export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const brand = await getBrandSettings(createAdminClient())

    return {
        name: `${brand.shortName} Reservas`,
        short_name: brand.shortName,
        description: brand.description,
        start_url: '/admin/dashboard',
        display: 'standalone',
        background_color: '#040201',
        theme_color: brand.primaryColor,
        icons: [
            {
                src: '/icon',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/apple-icon',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
