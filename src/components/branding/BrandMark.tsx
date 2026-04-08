import { defaultBrandSettings, getBrandInitials } from '@/lib/brand'

interface BrandMarkProps {
    size?: number
    brandName?: string
    shortName?: string
    logoUrl?: string | null
    primaryColor?: string
    secondaryColor?: string
    rounded?: number
}

export default function BrandMark({
    size = 40,
    brandName = defaultBrandSettings.brandName,
    shortName = defaultBrandSettings.shortName,
    logoUrl = defaultBrandSettings.logoUrl,
    primaryColor = defaultBrandSettings.primaryColor,
    secondaryColor = defaultBrandSettings.secondaryColor,
    rounded = Math.max(12, Math.round(size * 0.28)),
}: BrandMarkProps) {
    if (logoUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={logoUrl}
                alt={`Logo ${brandName}`}
                width={size}
                height={size}
                style={{
                    width: size,
                    height: size,
                    borderRadius: rounded,
                    objectFit: 'cover',
                    display: 'block',
                }}
            />
        )
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: rounded,
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: Math.max(14, Math.round(size * 0.36)),
                letterSpacing: '-0.03em',
                boxShadow: `0 8px 24px ${primaryColor}55`,
                flexShrink: 0,
            }}
        >
            {getBrandInitials(shortName)}
        </div>
    )
}
