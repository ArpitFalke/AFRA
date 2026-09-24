import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  name: z.string().trim().max(80).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json())
    if (!validateEmail(body.email)) return jsonError('Enter a valid email address.', 422)

    const passwordCheck = validatePassword(body.password)
    if (!passwordCheck.ok) return jsonError(passwordCheck.message!, 422)

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) return jsonError('An account with this email already exists.', 409)

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        name: body.name || body.email.split('@')[0],
      },
    })

    await setSessionCookie({ uid: user.id, email: user.email, role: user.role })
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } })
  } catch (err) {
    return handleApiError(err)
  }
}
