import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { DashboardClient } from './DashboardClient'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [projects, templates] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, projectType: true, thumbnail: true, updatedAt: true },
    }),
    prisma.template.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, description: true, tags: true, projectType: true, designDocument: true },
    }),
  ])

  return (
    <DashboardClient
      user={{ name: user.name, email: user.email, plan: user.plan }}
      projects={projects.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      templates={templates.map((t) => ({ ...t, tags: JSON.parse(t.tags) as string[] }))}
    />
  )
}
