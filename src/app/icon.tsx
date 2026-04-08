import { ImageResponse } from 'next/og'
import { getBrandInitials, getBrandSettings } from '@/lib/brand'
import { createAdminClient } from '@/lib/platform'

export const dynamic = 'force-dynamic'

export const size = {
    width: 512,
    height: 512,
}

export const contentType = 'image/png'

export default async function Icon() {
    const brand = await getBrandSettings(createAdminClient())

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
                    color: '#fff',
                    fontSize: 190,
                    fontWeight: 900,
                    letterSpacing: -12,
                }}
            >
                {getBrandInitials(brand.shortName)}
            </div>
        ),
        size
    )
}
