import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { studioForProjectType } from '@/lib/studios'

export const metadata = { title: 'Editor' }

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  await getCurrentUser()
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { projectType: true } })
  const studio = project ? studioForProjectType(project.projectType) : null
  redirect(studio ? studioRoutePath(studio.category, projectId) : '/dashboard')
}

function studioRoutePath(category: string, projectId: string) {
  return `/studio/${category}/project/${projectId}`
}
