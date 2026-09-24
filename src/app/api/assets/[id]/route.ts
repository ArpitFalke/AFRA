import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

const patchSchema = z.object({ name: z.string().trim().min(1).max(60) })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const asset = await prisma.asset.findUnique({ where: { id } })
    if (!asset || asset.userId !== user.id) return jsonError('Asset not found.', 404)

    const body = patchSchema.parse(await req.json())
    const updated = await prisma.asset.update({ where: { id }, data: { name: body.name } })
    return NextResponse.json({ asset: { id: updated.id, name: updated.name } })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const asset = await prisma.asset.findUnique({ where: { id } })
    if (!asset || asset.userId !== user.id) return jsonError('Asset not found.', 404)

    await getStorage().delete(asset.storageKey)
    await prisma.asset.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
