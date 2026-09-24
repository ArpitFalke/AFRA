import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const MAX_VERSIONS = 10

/** Version history for a project. Manual saves create snapshots. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== user.id) return jsonError('Project not found.', 404)

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { version: 'desc' },
      take: MAX_VERSIONS,
      select: { id: true, version: true, label: true, createdAt: true },
    })
    return NextResponse.json({ versions })
  } catch (err) {
    return handleApiError(err)
  }
}

/** Create a snapshot of the current design. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== user.id) return jsonError('Project not found.', 404)

    const latest = await prisma.projectVersion.findFirst({ where: { projectId: id }, orderBy: { version: 'desc' } })
    const version = (latest?.version ?? 0) + 1

    const created = await prisma.projectVersion.create({
      data: {
        projectId: id,
        version,
        label: `Version ${version}`,
        designDocument: project.designDocument,
      },
    })

    // prune older snapshots beyond the cap
    const old = await prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { version: 'desc' },
      skip: MAX_VERSIONS,
      select: { id: true },
    })
    if (old.length > 0) {
      await prisma.projectVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
    }

    return NextResponse.json({ version: { id: created.id, version: created.version, label: created.label, createdAt: created.createdAt } }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
