import type { AIProvider, DesignGenerationInput } from './index'
import { DESIGN_SPACE, type GeneratedDesign, type ShapeLayer, type TextLayer } from '@/lib/design/types'
import { createNumberLayer, createShapeLayer, createTextLayer } from '@/lib/design/defaults'

/**
 * OpenAI-compatible provider. Enabled only when AI_PROVIDER and AI_API_KEY
 * are configured (see .env.example). Uses the chat completions API in JSON
 * mode and validates the result against the design schema before returning
 * it — the model's output becomes editable layers, never raw images.
 */

const SYSTEM_PROMPT = `You are the design engine of AFRA, a 3D apparel studio.
Convert the user's description into a JSON design patch. Respond with ONLY JSON:
{
  "title": string (max 48 chars),
  "garment": { "color": hex },
  "summary": string (max 120 chars),
  "layers": [ array of layer objects, bottom-most first ]
}
Layer types:
- shape: { "type":"shape", "name":string, "side":"front"|"back", "preset":"stripe-h"|"stripe-v"|"double-stripe"|"chevron"|"ring"|"circle"|"round-rect"|"triangle"|"star"|"bolt", "color":hex, "secondaryColor":hex, "x":0..1, "y":0..1, "rotation":0-360, "scale":0.2..2 }
- text:  { "type":"text", "name":string, "side":"front"|"back", "text":string, "fontId":"inter"|"bebas"|"saira-condensed"|"archivo-black", "fontSize":20..400, "weight":400|700|900, "italic":boolean, "uppercase":boolean, "letterSpacing":0..0.5, "color":hex, "outline":{ "enabled":boolean, "color":hex, "width":0..20 }, "x":0..1, "y":0..1, "rotation":0-360, "scale":0.5..2 }
x and y are the CENTER of the layer on the garment side (0.5,0.42 is chest center).
Use 3-8 tasteful layers. Racing designs: stripes, chevrons, numbers, condensed fonts.`

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai'
  readonly supportsImageGeneration = true

  private baseUrl(): string {
    return (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  }

  private model(): string {
    return process.env.AI_MODEL ?? 'gpt-4o-mini'
  }

  async generateDesign(input: DesignGenerationInput): Promise<GeneratedDesign> {
    const res = await fetch(`${this.baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model(),
        response_format: { type: 'json_object' },
        temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Project type: ${input.projectType}. Style: ${input.style ?? 'any'}. Description: ${input.prompt}`,
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`AI provider error (${res.status}). ${body.slice(0, 180)}`)
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('AI provider returned an empty response.')
    return this.validate(JSON.parse(content), input.prompt)
  }

  async generateGraphics(input: { prompt: string; style?: string; variations?: number; garmentColor?: string }): Promise<
    { name: string; mime: 'image/svg+xml' | 'image/png'; data: string }[]
  > {
    const count = Math.min(4, Math.max(2, input.variations ?? 3))
    const styleLine = input.style ? ` Style: ${input.style}.` : ''
    const res = await fetch(`${this.baseUrl()}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_IMAGE_MODEL ?? 'gpt-image-1',
        prompt: `T-shirt graphic artwork, original racing-inspired design, bold clean vector shapes, print-ready, isolated on transparent background, no watermark.${styleLine} Description: ${input.prompt}`,
        n: count,
        size: '1024x1024',
        background: 'transparent',
        response_format: 'b64_json',
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`AI image provider error (${res.status}). ${body.slice(0, 180)}`)
    }
    const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] }
    const items = json.data ?? []
    const graphics: { name: string; mime: 'image/svg+xml' | 'image/png'; data: string }[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.b64_json) {
        graphics.push({ name: `AI graphic ${i + 1}`, mime: 'image/png', data: item.b64_json })
      } else if (item.url) {
        const imgRes = await fetch(item.url)
        if (!imgRes.ok) continue
        const buf = Buffer.from(await imgRes.arrayBuffer())
        graphics.push({ name: `AI graphic ${i + 1}`, mime: 'image/png', data: buf.toString('base64') })
      }
    }
    if (graphics.length === 0) throw new Error('The AI provider returned no images.')
    return graphics
  }

  async generateImage(): Promise<{ dataUrl: string }> {
    throw new Error('Image generation requires a provider with image support. Configure AI_MODEL accordingly.')
  }

  private validate(raw: unknown, prompt: string): GeneratedDesign {
    const data = raw as Record<string, unknown>
    const layers: (TextLayer | ShapeLayer)[] = []
    const rawLayers = Array.isArray(data.layers) ? data.layers : []
    for (const l of rawLayers.slice(0, 12)) {
      const obj = l as Record<string, unknown>
      const side = obj.side === 'back' ? 'back' : 'front'
      const x = clamp01(Number(obj.x ?? 0.5))
      const y = clamp01(Number(obj.y ?? 0.5))
      const scale = Math.min(2.5, Math.max(0.15, Number(obj.scale ?? 1)))
      const name = String(obj.name ?? 'Layer').slice(0, 40)
      if (obj.type === 'text') {
        layers.push(
          createTextLayer(side, {
            name,
            text: String(obj.text ?? '').slice(0, 60) || 'AFRA',
            fontId: ['inter', 'bebas', 'saira-condensed', 'archivo-black'].includes(String(obj.fontId))
              ? String(obj.fontId)
              : 'bebas',
            fontSize: Math.min(420, Math.max(20, Number(obj.fontSize ?? 120))),
            weight: (obj.weight === 700 || obj.weight === 900 ? obj.weight : 400) as TextLayer['weight'],
            italic: !!obj.italic,
            uppercase: !!obj.uppercase,
            letterSpacing: Math.min(0.5, Math.max(0, Number(obj.letterSpacing ?? 0.04))),
            color: hex(String(obj.color ?? '#F7F5EF'), '#F7F5EF'),
            outline: {
              enabled: !!(obj.outline as Record<string, unknown>)?.enabled,
              color: hex(String((obj.outline as Record<string, unknown>)?.color ?? '#0D0D0E'), '#0D0D0E'),
              width: Math.min(20, Math.max(0, Number((obj.outline as Record<string, unknown>)?.width ?? 8))),
            },
            x,
            y,
            rotation: Number(obj.rotation ?? 0) % 360,
            scale,
          }),
        )
      } else if (obj.type === 'shape') {
        const presets = ['stripe-h', 'stripe-v', 'double-stripe', 'chevron', 'ring', 'circle', 'round-rect', 'triangle', 'star', 'bolt']
        const preset = presets.includes(String(obj.preset)) ? (String(obj.preset) as ShapeLayer['preset']) : 'stripe-h'
        layers.push(
          createShapeLayer(side, preset, {
            name,
            color: hex(String(obj.color ?? '#F7F5EF'), '#F7F5EF'),
            secondaryColor: hex(String(obj.secondaryColor ?? '#FF5A1F'), '#FF5A1F'),
            x,
            y,
            rotation: Number(obj.rotation ?? 0) % 360,
            scale,
          }),
        )
      }
    }
    if (layers.length === 0) throw new Error('The AI response contained no usable layers.')
    const numbers = prompt.match(/\bnumber\s*(\d{1,3})\b/i)
    if (numbers) layers.push(createNumberLayer('back', numbers[1]))
    void DESIGN_SPACE
    return {
      title: String(data.title ?? 'AI Design').slice(0, 48),
      garment: { color: hex(String((data.garment as Record<string, unknown>)?.color ?? '#141416'), '#141416') },
      layers,
      summary: String(data.summary ?? 'AI design applied as editable layers.').slice(0, 140),
    }
  }
}

function clamp01(v: number) {
  return Math.min(0.95, Math.max(0.05, Number.isFinite(v) ? v : 0.5))
}

function hex(input: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(input.trim()) ? input.trim().toUpperCase() : fallback
}
