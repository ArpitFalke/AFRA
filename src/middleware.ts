import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'afra_session'

/**
 * Edge route guard: verifies the session JWT for app pages.
 * API routes perform their own full checks server-side.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  const { pathname, search } = req.nextUrl

  let authed = false
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))
      authed = true
    } catch {
      authed = false
    }
  }

  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/sign-in'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/editor/:path*', '/studio/:path*'],
}
