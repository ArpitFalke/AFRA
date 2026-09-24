import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/sign-in?error=google_unavailable', req.url))
  }
  const state = randomBytes(16).toString('hex')
  const store = await cookies()
  store.set('afra_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${req.nextUrl.origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
