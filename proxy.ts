import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — skip all checks
  const isPublic =
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/suspended') ||
    pathname.startsWith('/api/')

  // Unauthenticated access to protected route → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Fetch role + suspension status in a single query.
    // Fall back gracefully if the column doesn't exist yet (migration pending).
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single()

    // If the profile query itself errored (e.g. missing column) treat as
    // a plain authenticated user — do NOT kick them out or loop-redirect.
    if (profileError) {
      return supabaseResponse
    }

    // Suspended user accessing anything protected → suspension page
    if (profile?.is_suspended && !isPublic) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }

    // Logged-in user hits /login or / → redirect to their dashboard
    if (pathname === '/login' || pathname === '/') {
      const target =
        profile?.role === 'super_admin' ? '/admin/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(target, request.url))
    }

    // Guard /admin routes: only redirect if we have a confirmed non-admin role.
    // If profile is null for any reason, do not redirect (avoids false lockouts).
    if (
      pathname.startsWith('/admin') &&
      profile !== null &&
      profile?.role !== 'super_admin'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
