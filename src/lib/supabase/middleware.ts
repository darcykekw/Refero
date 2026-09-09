import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Route trees that require a signed-in user. */
const PROTECTED_ROOTS = ['/profile', '/bookmarks', '/theses/upload']

/** Pages that make no sense to a user who is already signed in. */
const AUTH_PAGES = ['/login', '/register']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROOTS.some(
    root => pathname === root || pathname.startsWith(`${root}/`)
  )
}

/**
 * Refreshes the Supabase auth session on every request.
 * Must be called from proxy.ts to keep the session alive.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing from environment variables.')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — safely handle any network or token exceptions
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch (err) {
    console.error('Failed to get user session in middleware:', err)
  }

  function redirectWithCookies(url: URL | string) {
    const redirectRes = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectRes
  }

  // Admin routes: require admin access
  const adminEmails = ['202380256@psu.palawan.edu.ph', 'lawsmagnet6@gmail.com']
  const isAdmin =
    (user?.email && adminEmails.includes(user.email.toLowerCase())) ||
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin'

  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('redirectTo', `${pathname}${search}`)
      return redirectWithCookies(loginUrl)
    }

    if (!isAdmin) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      homeUrl.search = '?error=unauthorized'
      return redirectWithCookies(homeUrl)
    }
  }

  // If user is admin and visits the public landing page or public feed, route strictly to admin UI
  if (user && isAdmin) {
    if (pathname === '/') {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      return redirectWithCookies(adminUrl)
    }
    if (pathname === '/theses') {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin/feed'
      return redirectWithCookies(adminUrl)
    }
  }

  // Protected routes: redirect unauthenticated users to /login
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    // Path *and* query, so signing in returns the visitor to the exact page
    // they asked for — page 3 of a filtered list, not the bare list.
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`)
    return redirectWithCookies(loginUrl)
  }

  // If already logged in, don't show auth pages. `?reset=success` is exempt: a
  // password reset lands on /login while the old session cookie may still be
  // present, and bouncing it to / hid the confirmation notice entirely.
  const isResetNotice = pathname === '/login' && searchParams.get('reset') === 'success'
  if (AUTH_PAGES.includes(pathname) && user && !isResetNotice) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.search = ''
    return redirectWithCookies(homeUrl)
  }

  return supabaseResponse
}
