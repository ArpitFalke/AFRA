import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { handleApiError, jsonError } from '@/lib/api-helpers'
import { getPlan } from '@/lib/plans'
import { recordUsage } from '@/lib/usage'
import { safeStorageKey, sanitizeSvg, getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'model/gltf-binary': 'glb',
}

const MAX_ASSETS = 100

export async function GET() {
  try {
    const user = await requireUser()
    const assets = await prisma.asset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, kind: true, mimeType: true, size: true, width: true, height: true, createdAt: true },
    })
    return NextResponse.json({ assets: assets.map((a) => ({ ...a, src: `/api/assets/${a.id}/file` })) })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return jsonError('No file uploaded.', 422)

    const mime = file.type.toLowerCase()
    if (!ALLOWED_TYPES[mime]) return jsonError('Unsupported file type. Use PNG, JPG, WEBP, SVG or GLB.', 422)

    const maxBytes = getPlan(user.plan).limits.uploadMaxMb * 1024 * 1024
    if (file.size > maxBytes) return jsonError(`File is too large. Maximum ${getPlan(user.plan).limits.uploadMaxMb}MB.`, 413)

    const count = await prisma.asset.count({ where: { userId: user.id } })
    if (count >= MAX_ASSETS) return jsonError('Asset library is full. Delete an asset to add more.', 402, 'PLAN_LIMIT')

    let buffer = Buffer.from(await file.arrayBuffer())

    // Never trust client-provided names; also verify extension matches content family.
    const key = safeStorageKey(user.id, file.name, mime)
    if (mime === 'image/svg+xml') {
      const svg = buffer.toString('utf8')
      if (!svg.includes('<svg')) return jsonError('Invalid SVG file.', 422)
      buffer = Buffer.from(sanitizeSvg(svg), 'utf8')
    }
    // Magic-byte sanity check for raster formats
    if (mime === 'image/png' && buffer.subarray(0, 4).toString('hex') !== '89504e47') {
      return jsonError('File content does not match a PNG image.', 422)
    }
    if (mime === 'image/jpeg' && buffer.subarray(0, 3).toString('hex') !== 'ffd8ff') {
      return jsonError('File content does not match a JPEG image.', 422)
    }

    const name = (file.name.replace(/\.[^.]+$/, '') || 'Asset').slice(0, 60)
    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        name,
        kind: form.get('kind') === 'logo' ? 'logo' : 'graphic',
        mimeType: mime,
        size: buffer.length,
        storageKey: key,
      },
    })

    await getStorage().put(key, buffer, { mimeType: mime })
    await recordUsage(user.id, 'upload')

    return NextResponse.json(
      {
        asset: {
          id: asset.id,
          name: asset.name,
          kind: asset.kind,
          mimeType: asset.mimeType,
          size: asset.size,
          src: `/api/assets/${asset.id}/file`,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    return handleApiError(err)
  }
}
