'use client'

import { useCallback, useEffect, useState } from 'react'

/** Upload one file to the asset library (shared by panels, paste & drop). */
export async function uploadAssetFile(file: File): Promise<AssetItem> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/assets', { method: 'POST', body: form })
  const body = (await res.json()) as { asset?: AssetItem; error?: { message: string } }
  if (!res.ok || !body.asset) throw new Error(body.error?.message ?? 'Upload failed')
  return body.asset
}

export interface AssetItem {
  id: string
  name: string
  kind: string
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  src: string
}

export function useAssets() {
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/assets')
      if (!res.ok) throw new Error('Could not load assets')
      const body = (await res.json()) as { assets: AssetItem[] }
      setAssets(body.assets)
    } catch {
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void refresh()
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const upload = useCallback(
    async (file: File): Promise<AssetItem | null> => {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/assets', { method: 'POST', body: form })
        const body = (await res.json()) as { asset?: AssetItem; error?: { message: string } }
        if (!res.ok || !body.asset) throw new Error(body.error?.message ?? 'Upload failed')
        setAssets((a) => [body.asset!, ...a])
        return body.asset
      } catch (err) {
        throw err
      } finally {
        setUploading(false)
      }
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    if (res.ok) setAssets((a) => a.filter((x) => x.id !== id))
  }, [])

  const rename = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) setAssets((a) => a.map((x) => (x.id === id ? { ...x, name } : x)))
  }, [])

  return { assets, loading, uploading, refresh, upload, remove, rename }
}
