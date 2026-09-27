import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { STUDIOS, type StudioCategory } from '@/lib/studios'
import { EditorPageClient } from '@/app/editor/[projectId]/EditorPageClient'

export const metadata = { title: 'Studio' }

export default async function StudioProjectPage({ params }: { params: Promise<{ category: string; projectId: string }> }) {
  const { category, projectId } = await params
  const def = STUDIOS[category as StudioCategory]
  if (!def || !def.live) notFound()

  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return (
    <Suspense>
      <EditorPageClient
        projectId={projectId}
        category={def.category}
        user={{ email: user.email, name: user.name, plan: user.plan }}
      />
    </Suspense>
  )
}
