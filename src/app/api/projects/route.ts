import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { checkProjectQuota } from '@/lib/usage'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { PROJECT_TYPES, PROJECT_TYPE_META, type DesignDocument, type ProjectType } from '@/lib/design/types'
import { createDefaultDocument } from '@/lib/design/defaults'

export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name your project.').max(80),
  projectType: z.enum(PROJECT_TYPES),
  templateId: z.string().cuid().optional(),
  variant: z.string().max(40).optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        projectType: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        lastOpenedAt: true,
      },
    })
    return NextResponse.json({ projects })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = createSchema.parse(await req.json())
    if (PROJECT_TYPE_META[body.projectType as ProjectType].status !== 'live') {
      return jsonError(`${PROJECT_TYPE_META[body.projectType as ProjectType].label} is coming soon.`, 400)
    }

    const quota = await checkProjectQuota(user.id, user.plan)
    if (!quota.allowed) return jsonError(quota.message!, 402, 'PLAN_LIMIT')

    let designDocument: DesignDocument
    if (body.templateId) {
      const template = await prisma.template.findUnique({ where: { id: body.templateId } })
      if (!template || !template.published) return jsonError('Template not found.', 404)
      designDocument = JSON.parse(template.designDocument) as DesignDocument
      designDocument.metadata.title = body.name
      designDocument.metadata.updatedAt = new Date().toISOString()
    } else {
      designDocument = createDefaultDocument(body.projectType, body.name)
      if (body.variant && /^[a-z]+-(oversized|regular|slim|cropped|boxy|longline)-(half|full)$/.test(body.variant)) {
        designDocument.garment.variant = body.variant
      }
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: body.name,
        projectType: body.projectType,
        designDocument: JSON.stringify(designDocument),
        lastOpenedAt: new Date(),
      },
    })
    return NextResponse.json({ project: { id: project.id, name: project.name, projectType: project.projectType } }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
