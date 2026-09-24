import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { checkExportQuota, getUsageSummary, recordUsage } from '@/lib/usage'
import { getPlan } from '@/lib/plans'

export const runtime = 'nodejs'

const exportSchema = z.object({
  projectId: z.string().cuid().optional(),
  format: z.enum(['png', 'jpg', 'webp']),
  resolutionPx: z.number().int().min(64).max(8192),
})

/**
 * Validates quota before the client-side render, records the export after.
 * POST { phase: "check" } → gate; POST { phase: "complete" } → record.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = exportSchema.extend({ phase: z.enum(['check', 'complete']) }).parse(await req.json())

    const plan = getPlan(user.plan)
    if (body.resolutionPx > plan.limits.exportMaxPx) {
      return jsonError(`Exports up to ${plan.limits.exportMaxPx}px are available on your plan.`, 402, 'PLAN_LIMIT')
    }

    if (body.phase === 'check') {
      const quota = await checkExportQuota(user.id, user.plan)
      if (!quota.allowed) return jsonError(quota.message!, 402, 'PLAN_LIMIT')
      return NextResponse.json({ ok: true })
    }

    await recordUsage(user.id, 'export')
    await prisma.exportJob.create({
      data: {
        userId: user.id,
        projectId: body.projectId,
        format: body.format,
        status: 'completed',
        options: JSON.stringify({ resolutionPx: body.resolutionPx }),
      },
    })
    const usage = await getUsageSummary(user.id, user.plan)
    return NextResponse.json({ ok: true, usage })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET() {
  try {
    const user = await requireUser()
    const usage = await getUsageSummary(user.id, user.plan)
    return NextResponse.json({ usage })
  } catch (err) {
    return handleApiError(err)
  }
}
