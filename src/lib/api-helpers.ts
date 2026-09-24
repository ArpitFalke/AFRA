import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from '@/lib/auth/session'
import { Prisma } from '@prisma/client'

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status })
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return jsonError('You need to sign in first.', 401)
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Invalid request.'
    return jsonError(message, 422)
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return jsonError('Not found.', 404)
  }
  console.error('[afra:api]', err)
  const message = err instanceof Error ? err.message : 'Something went wrong.'
  return jsonError(message, 500)
}
