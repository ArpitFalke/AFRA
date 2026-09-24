'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { EditorShell } from '@/components/editor/EditorShell'
import { AfraLogo } from '@/components/shared/AfraLogo'
import { Spinner } from '@/components/shared/Spinner'
import { useEditorStore } from '@/stores/editor-store'
import type { DesignDocument } from '@/lib/design/types'

export function EditorPageClient({
  projectId,
  user,
}: {
  projectId: string
  user: { email: string; name: string | null; plan: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const load = useEditorStore((s) => s.load)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (res.status === 404) {
          setState('notfound')
          return
        }
        if (!res.ok) throw new Error('Failed to load project')
        const body = (await res.json()) as { project: { name: string; designDocument: DesignDocument } }
        load(projectId, body.project.name, body.project.designDocument)
        setState('ready')
      } catch {
        setState('notfound')
      }
    })()
  }, [projectId, load])

  if (state === 'loading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-afra-bg">
        <AfraLogo size={30} />
        <div className="flex items-center gap-2 text-xs text-afra-muted">
          <Spinner size={13} /> Opening your studio…
        </div>
      </div>
    )
  }

  if (state === 'notfound') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-afra-bg px-6 text-center">
        <AfraLogo size={30} />
        <h1 className="mt-4 text-lg font-semibold">This project doesn&apos;t exist or isn&apos;t yours.</h1>
        <p className="text-sm text-afra-muted">It may have been deleted. Your other projects are safe on the dashboard.</p>
        <Link href="/dashboard" className="btn-primary mt-3 px-5 py-2 text-sm">
          Back to dashboard
        </Link>
        <button onClick={() => router.refresh()} className="btn-ghost text-xs">
          Try again
        </button>
      </div>
    )
  }

  return <EditorShell user={user} autoOpenAI={searchParams.get('ai') === '1'} />
}
