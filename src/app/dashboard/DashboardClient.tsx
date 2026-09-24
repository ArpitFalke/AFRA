'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AfraLogo } from '@/components/shared/AfraLogo'
import { Modal } from '@/components/shared/Modal'
import { Toaster, toast } from '@/components/shared/Toast'
import { Spinner } from '@/components/shared/Spinner'
import { PROJECT_TYPES, PROJECT_TYPE_META, type ProjectType } from '@/lib/design/types'
import { renderPreviewToCanvas } from '@/lib/design/preview'

interface ProjectRow {
  id: string
  name: string
  projectType: string
  thumbnail: string | null
  updatedAt: string
}

interface TemplateRow {
  id: string
  slug: string
  name: string
  description: string | null
  tags: string[]
  projectType: string
  designDocument: string
}

export function DashboardClient({
  user,
  projects,
  templates,
}: {
  user: { name: string | null; email: string; plan: string }
  projects: ProjectRow[]
  templates: TemplateRow[]
}) {
  const router = useRouter()
  const [newOpen, setNewOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [cardMenu, setCardMenu] = useState<string | null>(null)

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [projects, filter],
  )

  async function createProject(opts: { name: string; projectType: ProjectType; templateId?: string; ai?: boolean }) {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: opts.name, projectType: opts.projectType, templateId: opts.templateId }),
      })
      const body = (await res.json()) as { project?: { id: string }; error?: { message: string } }
      if (!res.ok || !body.project) throw new Error(body.error?.message ?? 'Could not create the project.')
      router.push(`/editor/${body.project.id}${opts.ai ? '?ai=1' : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the project.')
      setCreating(false)
    }
  }

  async function duplicate(p: ProjectRow) {
    const res = await fetch(`/api/projects/${p.id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      toast.success(`Duplicated “${p.name}”`)
      router.refresh()
    } else {
      const body = (await res.json()) as { error?: { message: string } }
      toast.error(body.error?.message ?? 'Duplicate failed')
    }
    setCardMenu(null)
  }

  async function remove(p: ProjectRow) {
    const res = await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Deleted “${p.name}”`)
      router.refresh()
    } else {
      toast.error('Delete failed')
    }
    setCardMenu(null)
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-afra-border bg-afra-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="text-afra-white transition-colors hover:text-afra-orange">
            <AfraLogo size={22} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-afra-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-afra-muted sm:block">
              {user.plan} plan
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-afra-surface text-xs font-bold text-afra-orange ring-1 ring-afra-border">
              {(user.name ?? user.email)[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        {/* Launchpad */}
        <section className="py-14 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create something.</h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm text-afra-muted">
            Design in 3D — t-shirts today, more coming. Start from a blank canvas, a template, or describe it to AI.
          </p>
          <button onClick={() => setNewOpen(true)} className="btn-primary mt-6 px-6 py-2.5 text-sm">
            + New Design
          </button>
        </section>

        {/* Recent */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="panel-section-title !text-xs">Recent</h2>
            {projects.length > 6 && (
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter projects…" className="input !w-44 !py-1 text-xs" aria-label="Filter projects" />
            )}
          </div>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-afra-border py-14 text-center">
              <p className="text-sm text-afra-muted">No projects yet.</p>
              <p className="mt-1 text-sm text-afra-muted">Create your first design.</p>
              <button onClick={() => setNewOpen(true)} className="btn-outline mt-4 px-4 py-2 text-xs">
                + New Design
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-xl border border-afra-border bg-afra-panel transition-colors hover:border-afra-muted">
                  <Link href={`/editor/${p.id}`} className="block">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-afra-surface">
                      {p.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <span className="text-afra-border">
                          <AfraLogo size={54} showWordmark={false} />
                        </span>
                      )}
                    </div>
                    <div className="px-3.5 py-3">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="mt-0.5 text-[11px] text-afra-muted">
                        {PROJECT_TYPE_META[p.projectType as ProjectType]?.label ?? p.projectType} · edited <ShortDate iso={p.updatedAt} />
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setCardMenu(cardMenu === p.id ? null : p.id)}
                    className="absolute right-2 top-2 rounded-md bg-afra-bg/70 p-1.5 text-afra-muted opacity-0 backdrop-blur transition-opacity hover:text-afra-white group-hover:opacity-100"
                    aria-label="Project actions"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="3" cy="8" r="1.4" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="13" cy="8" r="1.4" />
                    </svg>
                  </button>
                  {cardMenu === p.id && (
                    <div className="absolute right-2 top-10 z-10 w-36 animate-slide-up rounded-lg border border-afra-border bg-afra-panel p-1 shadow-xl shadow-black/50">
                      <button onClick={() => void duplicate(p)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-afra-hover">
                        Duplicate
                      </button>
                      <button onClick={() => void remove(p)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-afra-danger hover:bg-afra-hover">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Templates */}
        <section className="mt-12">
          <h2 className="panel-section-title mb-4 !text-xs">Templates</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => void createProject({ name: t.name, projectType: t.projectType as ProjectType, templateId: t.id })}
                className="group overflow-hidden rounded-xl border border-afra-border bg-afra-panel text-left transition-colors hover:border-afra-orange/60"
              >
                <div className="aspect-square bg-afra-surface">
                  <TemplatePreview designDocument={t.designDocument} />
                </div>
                <div className="px-2.5 py-2">
                  <div className="truncate text-xs font-medium">{t.name}</div>
                  {t.description && <div className="mt-0.5 truncate text-[10px] text-afra-muted">{t.description}</div>}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {newOpen && (
        <NewDesignModal open onClose={() => setNewOpen(false)} creating={creating} onCreate={createProject} templates={templates} />
      )}
      <Toaster />
    </div>
  )
}

/* ── Hydration-safe date (server TZ ≠ browser TZ) ──────────────────── */

const emptySubscribe = () => () => {}

function ShortDate({ iso }: { iso: string }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const d = new Date(iso)
  return (
    <>
      {mounted
        ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
    </>
  )
}

/* ── New design flow (PRD §37) ─────────────────────────────────────── */

function NewDesignModal({
  open,
  onClose,
  creating,
  onCreate,
  templates,
}: {
  open: boolean
  onClose: () => void
  creating: boolean
  onCreate: (opts: { name: string; projectType: ProjectType; templateId?: string; ai?: boolean }) => void
  templates: TemplateRow[]
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<ProjectType>('tshirt')
  const [name, setName] = useState('')

  return (
    <Modal open={open} onClose={onClose} title={step === 1 ? 'What are you making?' : 'Start from'} width={640}>
      {step === 1 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROJECT_TYPES.map((t) => {
            const meta = PROJECT_TYPE_META[t]
            const live = meta.status === 'live'
            return (
              <button
                key={t}
                disabled={!live}
                onClick={() => {
                  setType(t)
                  setStep(2)
                }}
                className={`relative rounded-lg border px-3 py-5 text-center text-sm transition-colors ${
                  live
                    ? 'border-afra-border bg-afra-surface hover:border-afra-orange/70 hover:bg-afra-hover'
                    : 'cursor-not-allowed border-afra-border/60 bg-transparent text-afra-muted/50'
                }`}
              >
                {meta.label}
                {!live && <span className="mt-1 block text-[9px] uppercase tracking-wider text-afra-muted/60">Coming soon</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="label mb-1.5 block" htmlFor="proj-name">
              Project name
            </label>
            <input id="proj-name" className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled design" maxLength={80} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <StartCard
              title="Blank"
              desc="Clean studio canvas."
              onClick={() => onCreate({ name: name.trim() || 'Untitled design', projectType: type })}
            />
            <StartCard
              title="Template"
              desc="Racing-inspired presets."
              onClick={() => onCreate({ name: name.trim() || 'Untitled design', projectType: type, templateId: templates[0]?.id })}
              submenu={templates.map((t) => ({ id: t.id, name: t.name }))}
              onPick={(templateId) => onCreate({ name: name.trim() || 'Untitled design', projectType: type, templateId })}
            />
            <StartCard
              title="Create with AI"
              desc="Describe it, edit everything."
              ai
              onClick={() => onCreate({ name: name.trim() || 'Untitled design', projectType: type, ai: true })}
            />
          </div>
          <button onClick={() => setStep(1)} className="btn-ghost mt-4 text-xs">
            ← Back
          </button>
        </div>
      )}
      {creating && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-afra-panel/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-afra-muted">
            <Spinner size={14} /> Creating…
          </div>
        </div>
      )}
    </Modal>
  )
}

function StartCard({
  title,
  desc,
  onClick,
  submenu,
  onPick,
  ai,
}: {
  title: string
  desc: string
  onClick: () => void
  submenu?: { id: string; name: string }[]
  onPick?: (id: string) => void
  ai?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`relative rounded-lg border bg-afra-surface p-3 text-left ${ai ? 'border-afra-orange/40' : 'border-afra-border'} hover:bg-afra-hover transition-colors`}>
      <button onClick={onClick} className="block w-full text-left">
        <div className={`text-sm font-semibold ${ai ? 'text-afra-orange' : ''}`}>{title}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-afra-muted">{desc}</div>
      </button>
      {submenu && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className="mt-2 text-[10px] uppercase tracking-wider text-afra-muted hover:text-afra-white"
          >
            {open ? 'Hide' : 'Browse'} templates
          </button>
          {open && (
            <div className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-afra-border">
              {submenu.map((t) => (
                <button
                  key={t.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPick?.(t.id)
                  }}
                  className="block w-full bg-afra-bg/60 px-2 py-1.5 text-left text-[11px] text-afra-white/85 hover:bg-afra-hover"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Template preview (real render from template JSON) ─────────────── */

function TemplatePreview({ designDocument }: { designDocument: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const doc = JSON.parse(designDocument)
        await document.fonts?.ready
        const canvas = renderPreviewToCanvas(doc, 320)
        if (!cancelled && ref.current) {
          ref.current.replaceChildren(canvas)
          canvas.style.width = '100%'
          canvas.style.height = '100%'
          canvas.style.objectFit = 'cover'
        }
      } catch {
        // leave empty
      }
    })()
    return () => {
      cancelled = true
    }
  }, [designDocument])
  return <div ref={ref} className="h-full w-full [&>canvas]:block" />
}
