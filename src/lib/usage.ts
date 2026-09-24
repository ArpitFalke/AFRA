import 'server-only'
import { prisma } from '@/lib/db'
import { getPlan } from '@/lib/plans'

export type UsageKind = 'ai_design' | 'ai_image' | 'export' | 'upload'

export async function recordUsage(userId: string, kind: UsageKind, amount = 1) {
  await prisma.usageEvent.create({ data: { userId, kind, amount } })
}

interface UsageCheck {
  allowed: boolean
  used: number
  limit: number
  message?: string
}

function startOfUtcDay(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function countSince(userId: string, kind: UsageKind, since: Date): Promise<number> {
  const agg = await prisma.usageEvent.aggregate({
    where: { userId, kind, createdAt: { gte: since } },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? 0
}

export async function checkAiDesignQuota(userId: string, plan: string): Promise<UsageCheck> {
  const limit = getPlan(plan).limits.aiDesignPerDay
  const used = await countSince(userId, 'ai_design', startOfUtcDay())
  return {
    allowed: used < limit,
    used,
    limit,
    message: `Daily AI generation limit reached (${limit} on the ${getPlan(plan).name} plan).`,
  }
}

export async function checkExportQuota(userId: string, plan: string): Promise<UsageCheck> {
  const limit = getPlan(plan).limits.exportsPerDay
  const used = await countSince(userId, 'export', startOfUtcDay())
  return {
    allowed: used < limit,
    used,
    limit,
    message: `Daily export limit reached (${limit} on the ${getPlan(plan).name} plan).`,
  }
}

export async function checkProjectQuota(userId: string, plan: string): Promise<UsageCheck> {
  const limit = getPlan(plan).limits.projects
  const used = await prisma.project.count({ where: { userId } })
  return {
    allowed: used < limit,
    used,
    limit,
    message: `Project limit reached (${limit} on the ${getPlan(plan).name} plan). Delete a project to free a slot.`,
  }
}

export async function getUsageSummary(userId: string, plan: string) {
  const limits = getPlan(plan).limits
  const [projects, aiDesign, exports] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    countSince(userId, 'ai_design', startOfUtcDay()),
    countSince(userId, 'export', startOfUtcDay()),
  ])
  return {
    plan: getPlan(plan),
    projects: { used: projects, limit: limits.projects },
    aiDesign: { used: aiDesign, limit: limits.aiDesignPerDay },
    exports: { used: exports, limit: limits.exportsPerDay },
  }
}
