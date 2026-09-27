import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const designDocumentSchema = z.object({
  id: z.string(),
  projectType: z.string(),
  version: z.number(),
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  garment: z.object({ color: z.string(), material: z.string(), variant: z.string().optional(), opacity: z.number().optional() }).passthrough(),
  sneaker: z.object({ parts: z.record(z.string(), z.object({ color: z.string(), material: z.string() }).passthrough()) }).optional(),
  layers: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'graphic', 'shape', 'pattern']),
      name: z.string().max(60),
      side: z.enum(['front', 'back']),
      visible: z.boolean(),
      locked: z.boolean(),
      opacity: z.number().min(0).max(1),
      x: z.number().min(-0.5).max(1.5),
      y: z.number().min(-0.5).max(1.5),
      rotation: z.number(),
      scale: z.number().min(0.01).max(10),
      // remaining type-specific fields validated loosely
    }).passthrough(),
  ).max(60),
  scene: z.object({ background: z.string(), customBackground: z.string(), floor: z.boolean() }).passthrough(),
  lighting: z.object({ preset: z.string(), intensity: z.number(), shadow: z.boolean() }).passthrough(),
})

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  designDocument: designDocumentSchema.optional(),
  thumbnail: z.string().max(400_000).optional(), // data URL preview
  opened: z.boolean().optional(),
})

async function getOwnedProject(id: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.userId !== userId) return null
  return project
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const project = await getOwnedProject(id, user.id)
    if (!project) return jsonError('Project not found.', 404)
    await prisma.project.update({ where: { id }, data: { lastOpenedAt: new Date() } })
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        projectType: project.projectType,
        thumbnail: project.thumbnail,
        designDocument: JSON.parse(project.designDocument),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const project = await getOwnedProject(id, user.id)
    if (!project) return jsonError('Project not found.', 404)

    const body = patchSchema.parse(await req.json())
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail
    if (body.opened) data.lastOpenedAt = new Date()
    if (body.designDocument) {
      body.designDocument.metadata.updatedAt = new Date().toISOString()
      data.designDocument = JSON.stringify(body.designDocument)
    }
    const updated = await prisma.project.update({ where: { id }, data })
    return NextResponse.json({ project: { id: updated.id, name: updated.name, updatedAt: updated.updatedAt } })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const project = await getOwnedProject(id, user.id)
    if (!project) return jsonError('Project not found.', 404)
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
