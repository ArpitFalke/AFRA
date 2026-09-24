import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { EditorPageClient } from './EditorPageClient'

export const metadata = { title: 'Editor' }

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  const { projectId } = await params
  return (
    <Suspense>
      <EditorPageClient projectId={projectId} user={{ email: user.email, name: user.name, plan: user.plan }} />
    </Suspense>
  )
}
