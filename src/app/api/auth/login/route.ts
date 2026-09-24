import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(1).max(128),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await req.json())
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.passwordHash) return jsonError('Invalid email or password.', 401)

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return jsonError('Invalid email or password.', 401)

    await setSessionCookie({ uid: user.id, email: user.email, role: user.role })
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } })
  } catch (err) {
    return handleApiError(err)
  }
}
