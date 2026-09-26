import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { aiProviderId, getAIProvider } from '@/lib/ai'
import { checkAiDesignQuota, recordUsage } from '@/lib/usage'
import { safeStorageKey, sanitizeSvg, getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

const graphicSchema = z.object({
  prompt: z.string().trim().min(4, 'Describe the graphic in a few words.').max(600),
  style: z.string().max(40).optional(),
  variations: z.number().int().min(2).max(4).default(3),
  garmentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function GET() {
  const provider = getAIProvider()
  return NextResponse.json({
    provider: aiProviderId(),
    graphicGeneration: typeof provider.generateGraphics === 'function',
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = graphicSchema.parse(await req.json())

    const quota = await checkAiDesignQuota(user.id, user.plan)
    if (!quota.allowed) return jsonError(quota.message!, 402, 'PLAN_LIMIT')

    const provider = getAIProvider()
    if (typeof provider.generateGraphics !== 'function') {
      return jsonError('The configured AI provider does not support graphic generation.', 501, 'UNSUPPORTED')
    }

    const job = await prisma.aIJob.create({
      data: {
        userId: user.id,
        kind: 'image',
        provider: provider.id,
        status: 'processing',
        input: JSON.stringify({ prompt: body.prompt, style: body.style, variations: body.variations }),
      },
    })

    try {
      const graphics = await provider.generateGraphics!(body)
      const stored = []
      for (const g of graphics) {
        let buffer: Buffer
        let mimeType: string
        if (g.mime === 'image/svg+xml') {
          buffer = Buffer.from(sanitizeSvg(g.data), 'utf8')
          mimeType = 'image/svg+xml'
        } else {
          buffer = Buffer.from(g.data, 'base64')
          mimeType = 'image/png'
        }
        const key = safeStorageKey(user.id, g.name, mimeType)
        await getStorage().put(key, buffer, { mimeType })
        const asset = await prisma.asset.create({
          data: {
            userId: user.id,
            name: g.name.slice(0, 60),
            kind: 'graphic',
            mimeType,
            size: buffer.length,
            storageKey: key,
          },
        })
        stored.push({ assetId: asset.id, src: `/api/assets/${asset.id}/file`, name: asset.name })
      }

      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'completed', output: JSON.stringify({ count: stored.length }), completedAt: new Date() },
      })
      await recordUsage(user.id, 'ai_image')

      return NextResponse.json({ jobId: job.id, provider: provider.id, variations: stored })
    } catch (genErr) {
      const message = genErr instanceof Error ? genErr.message : 'Graphic generation failed.'
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
