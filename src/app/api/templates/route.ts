import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-helpers'

export const runtime = 'nodejs'

/** Published templates. Public — the landing page shows them too. */
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        projectType: true,
        description: true,
        tags: true,
        premium: true,
        designDocument: true,
      },
    })
    return NextResponse.json({ templates: templates.map((t) => ({ ...t, tags: JSON.parse(t.tags) as string[] })) })
  } catch (err) {
    return handleApiError(err)
  }
}
