import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const COOKIE_NAME = 'afra_session'
const SESSION_DAYS = 30

export interface SessionPayload {
  uid: string
  email: string
  role: string
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short. Set it in .env (see .env.example).')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null
    return { uid: payload.uid, email: payload.email, role: typeof payload.role === 'string' ? payload.role : 'user' }
  } catch {
    return null
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export interface SafeUser {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  createdAt: Date
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.uid } })
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, createdAt: user.createdAt }
}

/** Throws a tagged error when unauthenticated; use inside API routes. */
export class AuthError extends Error {
  constructor() {
    super('UNAUTHENTICATED')
  }
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthError()
  return user
}
