import SetupWizardClient from '@/components/setup/SetupWizardClient'
import { runtimeFlags } from '@/lib/brand'
import { countAdminUsers, createAdminClient } from '@/lib/platform'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    const canRunSetup = runtimeFlags.setupEnabled
        ? (await countAdminUsers(createAdminClient())) === 0
        : false

    return (
        <main style={{ minHeight: '100vh', background: '#040201', padding: '48px 24px', color: '#fff' }}>
            <SetupWizardClient canRunSetup={canRunSetup} />
        </main>
    )
}
