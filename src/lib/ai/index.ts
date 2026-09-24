import type { DesignDocument, GeneratedDesign } from '@/lib/design/types'
import { LocalDesignProvider } from './local-generator'
import { OpenAICompatibleProvider } from './openai-provider'

/**
 * AI provider abstraction. AFRA never talks to a specific vendor from the
 * UI — providers are swapped server-side via AI_PROVIDER env var.
 */

export interface DesignGenerationInput {
  prompt: string
  style?: string
  projectType: DesignDocument['projectType']
}

export interface ImageGenerationInput {
  prompt: string
  aspectRatio?: string
}

export interface AIProvider {
  readonly id: string
  readonly supportsImageGeneration: boolean
  generateDesign(input: DesignGenerationInput): Promise<GeneratedDesign>
  generateImage?(input: ImageGenerationInput): Promise<{ dataUrl: string }>
}

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? 'local').toLowerCase()
  if ((provider === 'openai' || provider === 'openai-compatible') && process.env.AI_API_KEY) {
    return new OpenAICompatibleProvider()
  }
  return new LocalDesignProvider()
}

export function aiProviderId(): string {
  const provider = (process.env.AI_PROVIDER ?? 'local').toLowerCase()
  if ((provider === 'openai' || provider === 'openai-compatible') && process.env.AI_API_KEY) return 'openai'
  return 'local'
}
