'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AfraLogo } from '@/components/shared/AfraLogo'
import { Modal } from '@/components/shared/Modal'
import { Toaster, toast } from '@/components/shared/Toast'
import { Spinner } from '@/components/shared/Spinner'
import { renderPreviewToCanvas } from '@/lib/design/preview'
import { studioRoute, type StudioDef } from '@/lib/studios'
import type { ProjectType } from '@/lib/design/types'

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

const emptySubscribe = () => () => {}

function ShortDate({ iso }: { iso: string }) {
  const mounted = useSyncExternalStoreExternal()
  const d = new Date(iso)
  return (
    <>
      {mounted
        ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
    </>
  )
}

function useSyncExternalStoreExternal() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export function StudioLandingClient({
  def,
  user,
  projects,
  templates,
}: {
  def: StudioDef
  user: { name: string | null; email: string; plan: string }
  projects: ProjectRow[]
  templates: TemplateRow[]
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')

  async function create(templateId?: string) {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `Untitled ${def.title.replace(' Studio', '')}`,
          projectType: def.projectType,
          ...(templateId ? { templateId } : {}),
          ...(def.category === 'jerseys' ? { variant: 'jersey-football' } : {}),
          ...(def.category === 'sneakers' ? { variant: 'sneaker-low' } : {}),
        }),
      })
      const body = (await res.json()) as { project?: { id: string }; error?: { message: string } }
      if (!res.ok || !body.project) throw new Error(body.error?.message ?? 'Could not create the project.')
      router.push(studioRoute(def.category, body.project.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the project.')
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-afra-border bg-afra-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-3 text-afra-white transition-colors hover:text-afra-orange">
            <AfraLogo size={20} showWordmark={false} />
            <span className="text-sm font-semibold">{def.title}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-afra-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-afra-muted sm:block">
              {user.plan} plan
            </span>
            <button onClick={() => setNewOpen(true)} className="btn-primary h-8 px-4 text-xs">
              + New {def.title.replace(' Studio', '')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{def.title}</h1>
          <p className="mt-2 max-w-lg text-sm text-afra-muted">{def.tagline}</p>
          <button onClick={() => setNewOpen(true)} className="btn-primary mt-5 px-6 py-2.5 text-sm">
            + New {def.title.replace(' Studio', '')}
          </button>
        </section>

        <section>
          <h2 className="panel-section-title mb-4 !text-xs">Your {def.title.replace(' Studio', '')}s</h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-afra-border py-14 text-center">
              <p className="text-sm text-afra-muted">Nothing here yet — start your first design.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={studioRoute(def.category, p.id)}
                  className="group overflow-hidden rounded-xl border border-afra-border bg-afra-panel transition-colors hover:border-afra-muted"
                >
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
                    <div className="mt-0.5 text-[11px] text-afra-muted">edited <ShortDate iso={p.updatedAt} /></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {templates.length > 0 && (
          <section className="mt-12">
            <h2 className="panel-section-title mb-4 !text-xs">Templates</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => void create(t.id)}
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
        )}
      </main>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title={`New ${def.title.replace(' Studio', '')}`} width={480}>
        <label className="label mb-1.5 block" htmlFor="studio-proj-name">
          Project name
        </label>
        <input id="studio-proj-name" className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled design" maxLength={80} />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button onClick={() => void create()} className="btn-outline py-2.5 text-sm">
            Blank canvas
          </button>
          {templates[0] && (
            <button onClick={() => void create(templates[0].id)} className="btn-outline py-2.5 text-sm">
              From “{templates[0].name}”
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-snug text-afra-muted">You can apply templates, AI artwork and uploads inside the studio.</p>
      </Modal>
      {creating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-2 rounded-lg border border-afra-border bg-afra-panel px-5 py-3 text-xs text-afra-muted">
            <Spinner size={14} /> Creating…
          </div>
        </div>
      )}
      <Toaster />
    </div>
  )
}

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
