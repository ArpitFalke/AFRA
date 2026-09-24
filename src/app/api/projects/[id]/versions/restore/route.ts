import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

/** Restore a specific version snapshot into the live project. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { versionId } = (await req.json()) as { versionId?: string }
    if (!versionId) return jsonError('versionId is required.', 422)

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== user.id) return jsonError('Project not found.', 404)

    const version = await prisma.projectVersion.findUnique({ where: { id: versionId } })
    if (!version || version.projectId !== id) return jsonError('Version not found.', 404)

    await prisma.project.update({ where: { id }, data: { designDocument: version.designDocument } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
