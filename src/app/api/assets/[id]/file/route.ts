import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

/**
 * Serves uploaded asset files. Authenticated read; the session cookie is
 * available to <img> tags automatically. Immutable per asset id.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const asset = await prisma.asset.findUnique({ where: { id } })
  if (!asset) return new NextResponse('Not found', { status: 404 })

  // Owner or admin only
  if (asset.userId !== session.uid && session.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const data = await getStorage().get(asset.storageKey)
  if (!data) return new NextResponse('Not found', { status: 404 })

  const ext = asset.storageKey.split('.').pop()
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      ...(ext === 'svg' ? { 'Content-Security-Policy': "script-src 'none'" } : {}),
    },
  })
}
