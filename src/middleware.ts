import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { runtimeFlags } from '@/lib/brand'

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isAdminLoginRoute = pathname === '/admin/login'
    const isSetupRoute = pathname.startsWith('/setup')

    if (runtimeFlags.adminFreeAccess && isAdminRoute) {
        return NextResponse.next({ request })
    }

    if (!isAdminRoute || isSetupRoute) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !isAdminLoginRoute) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    if (user && isAdminLoginRoute) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = '/admin/dashboard'
        dashboardUrl.search = ''
        return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
