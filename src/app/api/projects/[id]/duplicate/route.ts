import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const duplicateSchema = z.object({ name: z.string().trim().min(1).max(80).optional() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const source = await prisma.project.findUnique({ where: { id } })
    if (!source || source.userId !== user.id) return jsonError('Project not found.', 404)

    let name = `${source.name} copy`
    try {
      const body = duplicateSchema.parse(await req.json())
      if (body.name) name = body.name
    } catch {
      // body optional
    }

    const copy = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        projectType: source.projectType,
        thumbnail: source.thumbnail,
        designDocument: source.designDocument,
        lastOpenedAt: new Date(),
      },
    })
    return NextResponse.json({ project: { id: copy.id, name: copy.name } }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
