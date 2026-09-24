import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { aiProviderId, getAIProvider } from '@/lib/ai'
import { checkAiDesignQuota, recordUsage } from '@/lib/usage'
import { PROJECT_TYPES, PROJECT_TYPE_META, type DesignDocument, type ProjectType } from '@/lib/design/types'

export const runtime = 'nodejs'

const genSchema = z.object({
  prompt: z.string().trim().min(4, 'Describe your design in a few words.').max(600),
  style: z.string().max(40).optional(),
  projectType: z.enum(PROJECT_TYPES).default('tshirt'),
  projectId: z.string().cuid().optional(),
})

export async function GET() {
  // Client uses this to decide whether image generation UI should exist.
  const provider = getAIProvider()
  return NextResponse.json({ provider: aiProviderId(), imageGeneration: provider.supportsImageGeneration })
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = genSchema.parse(await req.json())
    if (PROJECT_TYPE_META[body.projectType as ProjectType].status !== 'live') {
      return jsonError(`${PROJECT_TYPE_META[body.projectType as ProjectType].label} generation is coming soon.`, 400)
    }

    const quota = await checkAiDesignQuota(user.id, user.plan)
    if (!quota.allowed) return jsonError(quota.message!, 402, 'PLAN_LIMIT')

    const provider = getAIProvider()
    const job = await prisma.aIJob.create({
      data: {
        userId: user.id,
        projectId: body.projectId,
        kind: 'design',
        provider: provider.id,
        status: 'processing',
        input: JSON.stringify({ prompt: body.prompt, style: body.style, projectType: body.projectType }),
      },
    })

    try {
      const result = await provider.generateDesign({
        prompt: body.prompt,
        style: body.style,
        projectType: body.projectType as DesignDocument['projectType'],
      })
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'completed', output: JSON.stringify(result), completedAt: new Date() },
      })
      await recordUsage(user.id, 'ai_design')
      return NextResponse.json({ jobId: job.id, provider: provider.id, result })
    } catch (genErr) {
      const message = genErr instanceof Error ? genErr.message : 'Generation failed.'
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: message, completedAt: new Date() },
      })
      return jsonError(message, 502, 'GENERATION_FAILED')
    }
  } catch (err) {
    return handleApiError(err)
  }
}
