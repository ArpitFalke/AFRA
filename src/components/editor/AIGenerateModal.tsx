'use client'

import { useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Spinner } from '@/components/shared/Spinner'
import { toast } from '@/components/shared/Toast'
import { useEditorStore } from '@/stores/editor-store'
import type { GeneratedDesign } from '@/lib/design/types'

const EXAMPLES = [
  'Black racing t-shirt with orange aerodynamic stripes and number 27',
  'White minimal tee with a small orange AFRA emblem',
  'Night circuit jersey in charcoal with yellow chevrons and name "KURO"',
  'Tokyo street shirt with red bolt graphics',
]

/**
 * Focused AI generation sheet. Results are structured, editable layers —
 * never a flat image — so the user keeps full control afterwards.
 */
export function AIGenerateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projectId = useEditorStore((s) => s.projectId)
  const applyGenerated = useEditorStore((s) => s.applyGenerated)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('racing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (loading) return
    setError(null)
    if (prompt.trim().length < 4) {
      setError('Describe your design in a few words.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style, projectType: 'tshirt', projectId: projectId || undefined }),
      })
      const body = (await res.json()) as { result?: GeneratedDesign; error?: { message: string } }
      if (!res.ok || !body.result) throw new Error(body.error?.message ?? 'Generation failed.')
      applyGenerated(body.result)
      toast.success(body.result.summary ?? 'AI design applied as editable layers.')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Your project is safe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create with AI" width={560}>
      <label className="label mb-1.5 block" htmlFor="ai-prompt">
        Describe your design
      </label>
      <textarea
        id="ai-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. Black racing t-shirt with orange stripes and the number 27"
        className="input resize-none text-sm"
        disabled={loading}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="rounded-full border border-afra-border px-2.5 py-1 text-[10px] text-afra-muted transition-colors hover:border-afra-orange/60 hover:text-afra-white"
            disabled={loading}
          >
            {ex.length > 42 ? `${ex.slice(0, 42)}…` : ex}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block" htmlFor="ai-style">
            Style
          </label>
          <select id="ai-style" value={style} onChange={(e) => setStyle(e.target.value)} className="input cursor-pointer text-sm" disabled={loading}>
            <option value="racing">Racing</option>
            <option value="street">Street</option>
            <option value="minimal">Minimal</option>
            <option value="retro">Retro</option>
            <option value="sport">Sport</option>
          </select>
        </div>
        <div>
          <div className="label mb-1.5">Object</div>
          <div className="input flex items-center text-sm text-afra-muted">T-Shirt</div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-[rgba(224,82,82,0.4)] bg-[rgba(224,82,82,0.08)] px-3 py-2.5 text-xs leading-relaxed text-afra-danger">
          {error}
          <div className="mt-1 text-afra-muted">Your project is safe — nothing was lost.</div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="max-w-[16rem] text-[10px] leading-snug text-afra-muted">
          AFRA generates structured, editable layers — you can change every color, text and graphic afterwards.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost px-3 py-2 text-xs">
            Cancel
          </button>
          <button onClick={() => void generate()} disabled={loading} className="btn-primary px-5 py-2 text-xs">
            {loading ? (
              <>
                <Spinner size={13} /> Generating…
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
