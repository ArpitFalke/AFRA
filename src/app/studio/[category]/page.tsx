import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { STUDIOS, type StudioCategory } from '@/lib/studios'
import { prisma } from '@/lib/db'
import { StudioLandingClient } from './StudioLandingClient'

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const def = STUDIOS[category as StudioCategory]
  return { title: def ? def.title : 'Studio' }
}

export default async function StudioPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const def = STUDIOS[category as StudioCategory]
  if (!def || !def.live) notFound()

  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [projects, templates] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id, projectType: def.projectType },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, projectType: true, thumbnail: true, updatedAt: true },
    }),
    prisma.template.findMany({
      where: { published: true, projectType: def.projectType },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, description: true, tags: true, projectType: true, designDocument: true },
    }),
  ])

  return (
    <StudioLandingClient
      def={def}
      user={{ name: user.name, email: user.email, plan: user.plan }}
      projects={projects.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      templates={templates.map((t) => ({ ...t, tags: JSON.parse(t.tags) as string[] }))}
    />
  )
}
