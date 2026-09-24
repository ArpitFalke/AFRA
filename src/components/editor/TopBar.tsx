'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AfraLogo } from '@/components/shared/AfraLogo'
import { toast } from '@/components/shared/Toast'
import { Spinner } from '@/components/shared/Spinner'
import { useEditorStore } from '@/stores/editor-store'
import type { DesignDocument } from '@/lib/design/types'

interface VersionItem {
  id: string
  version: number
  label: string
  createdAt: string
}

export function TopBar({ user, onOpenAI, onOpenExport, onTogglePresent, onSave }: {
  user: { email: string; name: string | null; plan: string }
  onOpenAI: () => void
  onOpenExport: () => void
  onTogglePresent: () => void
  onSave: () => void
}) {
  const router = useRouter()
  const projectName = useEditorStore((s) => s.projectName)
  const setProjectName = useEditorStore((s) => s.setProjectName)
  const saveState = useEditorStore((s) => s.saveState)
  const projectId = useEditorStore((s) => s.projectId)
  const replaceDoc = useEditorStore((s) => s.replaceDoc)
  const setSaveState = useEditorStore((s) => s.setSaveState)

  const [profileOpen, setProfileOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState<VersionItem[] | null>(null)
  const [restoring, setRestoring] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!versionsOpen || versions) return
    void fetch(`/api/projects/${projectId}/versions`)
      .then((r) => r.json())
      .then((b: { versions?: VersionItem[] }) => setVersions(b.versions ?? []))
  }, [versionsOpen, versions, projectId])

  async function restore(v: VersionItem) {
    if (restoring) return
    setRestoring(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: v.id }),
      })
      if (!res.ok) throw new Error()
      const projectRes = await fetch(`/api/projects/${projectId}`)
      const body = (await projectRes.json()) as { project?: { designDocument: DesignDocument } }
      if (body.project) {
        replaceDoc(body.project.designDocument)
        setSaveState('saved')
        toast.success(`Restored ${v.label}`)
      }
      setVersionsOpen(false)
    } catch {
      toast.error('Could not restore that version.')
    } finally {
      setRestoring(false)
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const saveLabel = { saved: 'Saved', saving: 'Saving…', unsaved: 'Unsaved', error: 'Save failed' }[saveState]

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center justify-between border-b border-afra-border bg-afra-panel px-3">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/dashboard" className="shrink-0 text-afra-white hover:text-afra-orange transition-colors" aria-label="Back to dashboard">
          <AfraLogo size={22} showWordmark={false} />
        </Link>
        <input
          ref={nameInput}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-40 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium text-afra-white/90 outline-none hover:bg-afra-hover focus:bg-afra-hover sm:w-56"
          aria-label="Project name"
          maxLength={80}
        />
        <span
          className={`hidden text-[11px] sm:block ${
            saveState === 'error' ? 'text-afra-danger' : saveState === 'saved' ? 'text-afra-muted' : 'text-afra-yellow'
          }`}
        >
          {saveLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={onOpenAI} className="btn-ghost h-8 px-3 text-xs" title="Create with AI">
          <SparkleIcon />
          <span className="hidden sm:inline">Create with AI</span>
        </button>
        <button onClick={onTogglePresent} className="btn-ghost h-8 px-3 text-xs" title="Presentation mode">
          <span className="hidden md:inline">Present</span>
          <PresentIcon />
        </button>
        <div className="relative">
          <button onClick={() => setVersionsOpen((v) => !v)} className="btn-ghost h-8 px-3 text-xs" title="Version history">
            <ClockIcon />
          </button>
          {versionsOpen && (
            <div className="absolute right-0 top-10 w-64 animate-slide-up rounded-lg border border-afra-border bg-afra-panel p-2 shadow-xl shadow-black/50">
              <div className="panel-section-title px-2 pb-1.5 pt-1">Versions</div>
              {!versions && (
                <div className="flex items-center gap-2 px-2 py-3 text-xs text-afra-muted">
                  <Spinner size={12} /> Loading…
                </div>
              )}
              {versions?.length === 0 && <div className="px-2 py-3 text-xs text-afra-muted">No snapshots yet. Use Save to create one.</div>}
              {versions?.map((v) => (
                <button
                  key={v.id}
                  onClick={() => void restore(v)}
                  disabled={restoring}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-afra-white/85 hover:bg-afra-hover disabled:opacity-50"
                >
                  <span>{v.label}</span>
                  <span className="text-afra-muted">{new Date(v.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onSave} className="btn-ghost h-8 px-3 text-xs">
          Save
        </button>
        <button onClick={onOpenExport} className="btn-primary h-8 px-3.5 text-xs">
          Export
        </button>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-afra-surface text-xs font-bold text-afra-orange ring-1 ring-afra-border hover:ring-afra-orange transition-shadow"
            aria-label="Profile menu"
          >
            {(user.name ?? user.email)[0]?.toUpperCase()}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-10 w-52 animate-slide-up rounded-lg border border-afra-border bg-afra-panel p-2 shadow-xl shadow-black/50">
              <div className="px-2 py-1.5">
                <div className="truncate text-xs font-medium">{user.name ?? 'Creator'}</div>
                <div className="truncate text-[11px] text-afra-muted">{user.email}</div>
                <div className="mt-1 inline-block rounded bg-afra-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-afra-orange">{user.plan}</div>
              </div>
              <Link href="/dashboard" className="block rounded-md px-2 py-1.5 text-xs text-afra-white/85 hover:bg-afra-hover">
                Dashboard
              </Link>
              <button onClick={() => void signOut()} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-afra-muted hover:bg-afra-hover hover:text-afra-white">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13 6.4 8.6 2 7l4.4-1.6L8 1z" />
      <path d="M13 10.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" opacity="0.6" />
    </svg>
  )
}
function PresentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 5V3h12v2M8 3v10M5.5 13h5" strokeLinecap="round" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.8V8l2.2 1.6" strokeLinecap="round" />
    </svg>
  )
}
