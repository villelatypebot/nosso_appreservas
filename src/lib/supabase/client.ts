// Loosely-typed Supabase client for use in components
// This avoids TypeScript compilation errors when real database types
// haven't been generated yet via `supabase gen types typescript`.
// After connecting your Supabase project, run:
//   npx supabase gen types typescript --project-id YOUR_ID > src/lib/supabase/types.ts
// and then remove this file / update client imports.

import { createBrowserClient } from '@supabase/ssr'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): ReturnType<typeof createBrowserClient<any>> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
