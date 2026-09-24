import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const store = await cookies()
  const expectedState = store.get('afra_oauth_state')?.value
  store.set('afra_oauth_state', '', { path: '/', maxAge: 0 })

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/sign-in?error=oauth_state', req.url))
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/sign-in?error=google_unavailable', req.url))
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.nextUrl.origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('token exchange failed')
    const token = (await tokenRes.json()) as { access_token?: string }
    if (!token.access_token) throw new Error('no access token')

    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (!profileRes.ok) throw new Error('userinfo failed')
    const profile = (await profileRes.json()) as { sub: string; email?: string; name?: string; email_verified?: boolean }
    if (!profile.email) throw new Error('email missing')

    const providerAccountId = profile.sub
    let user = await prisma.user.findFirst({
      where: { accounts: { some: { provider: 'google', providerAccountId } } },
    })

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } })
      if (existingByEmail) {
        user = await prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: providerAccountId } })
      } else {
        user = await prisma.user.create({
          data: { email: profile.email, name: profile.name ?? profile.email.split('@')[0], googleId: providerAccountId },
        })
      }
      await prisma.account.create({
        data: { userId: user.id, provider: 'google', providerAccountId },
      })
    }

    await setSessionCookie({ uid: user.id, email: user.email, role: user.role })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (err) {
    console.error('[afra:google-oauth]', err)
    return NextResponse.redirect(new URL('/sign-in?error=google_failed', req.url))
  }
}
