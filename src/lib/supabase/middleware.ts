import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Route trees that require a signed-in user. `/` is handled separately. */
const PROTECTED_ROOTS = ['/theses', '/profile']

/** Pages that make no sense to a user who is already signed in. */
const AUTH_PAGES = ['/login', '/register']

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PROTECTED_ROOTS.some(
    root => pathname === root || pathname.startsWith(`${root}/`)
  )
}

/**
 * Refreshes the Supabase auth session on every request.
 * Must be called from proxy.ts to keep the session alive.
 */
export async function updateSession(request: NextRequest) {
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

  // Refresh session — do not remove this line.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search, searchParams } = request.nextUrl

  // Protected routes: redirect unauthenticated users to /login
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    // Path *and* query, so signing in returns the visitor to the exact page
    // they asked for — page 3 of a filtered list, not the bare list.
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  // If already logged in, don't show auth pages. `?reset=success` is exempt: a
  // password reset lands on /login while the old session cookie may still be
  // present, and bouncing it to / hid the confirmation notice entirely.
  const isResetNotice = pathname === '/login' && searchParams.get('reset') === 'success'
  if (AUTH_PAGES.includes(pathname) && user && !isResetNotice) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}
