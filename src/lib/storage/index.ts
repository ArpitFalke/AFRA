import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Storage abstraction. The local filesystem adapter is the default for
 * development. An S3-compatible adapter can be plugged in by implementing
 * `StorageAdapter` and wiring it here — all configuration comes from env
 * vars documented in .env.example. Nothing is hard-coded to a provider.
 */

export interface PutOptions {
  mimeType: string
}

export interface StorageAdapter {
  put(key: string, data: Buffer, opts: PutOptions): Promise<void>
  get(key: string): Promise<Buffer | null>
  delete(key: string): Promise<void>
  /** Public or signed URL from which the object can be read. */
  url(key: string): string
}

/** Generates a safe storage key — never trusts client filenames. */
export function safeStorageKey(userId: string, originalName: string, mimeType: string): string {
  const ext = sanitizeExtension(originalName, mimeType)
  const hash = createHash('sha1').update(`${userId}:${Date.now()}:${randomBytes(8).toString('hex')}`).digest('hex').slice(0, 20)
  return `uploads/${userId}/${hash}.${ext}`
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

function sanitizeExtension(originalName: string, mimeType: string): string {
  const fromMime = MIME_EXTENSIONS[mimeType]
  if (fromMime) return fromMime
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext.slice(0, 5) || 'bin'
}

class LocalStorageAdapter implements StorageAdapter {
  constructor(private root: string) {}

  private resolve(key: string): string {
    const full = path.resolve(this.root, key)
    if (!full.startsWith(path.resolve(this.root))) throw new Error('Invalid storage key')
    return full
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, data)
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key))
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key))
    } catch {
      // already gone
    }
  }

  url(): string {
    // Local adapter serves through the authenticated file route.
    return ''
  }
}

let adapter: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (!adapter) {
    // Serverless platforms (e.g. Vercel) expose only /tmp as writable —
    // uploads work there but are ephemeral until a durable adapter
    // (S3-compatible) is configured. See README > Storage.
    const root =
      process.env.AFRA_STORAGE_DIR ??
      (process.env.VERCEL ? '/tmp/afra-uploads' : path.join(process.cwd(), '.data'))
    adapter = new LocalStorageAdapter(root)
  }
  return adapter
}

/**
 * Basic SVG sanitizer: uploaded SVGs are served same-origin, so strip
 * script vectors and event handlers before persisting.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
}
