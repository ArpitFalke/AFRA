/**
 * Plan configuration. Prices are intentionally not hard-coded — billing is
 * not enabled in this milestone (see README). Limits are enforced
 * server-side in src/lib/usage.ts; never trust the frontend.
 */

export interface PlanDef {
  id: 'free' | 'pro' | 'studio'
  name: string
  tagline: string
  limits: {
    projects: number
    aiDesignPerDay: number
    exportsPerDay: number
    uploadMaxMb: number
    exportMaxPx: number
  }
  features: string[]
}

export const PLANS: Record<PlanDef['id'], PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Start creating in 3D.',
    limits: {
      projects: 3,
      aiDesignPerDay: 15,
      exportsPerDay: 10,
      uploadMaxMb: 8,
      exportMaxPx: 2048,
    },
    features: ['3 projects', 'T-Shirt 3D editor', '15 AI generations / day', 'HD exports up to 2K'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious creators.',
    limits: {
      projects: 50,
      aiDesignPerDay: 200,
      exportsPerDay: 100,
      uploadMaxMb: 25,
      exportMaxPx: 4096,
    },
    features: ['50 projects', '4K exports', '200 AI generations / day', 'Premium templates'],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    tagline: 'For teams and studios.',
    limits: {
      projects: 500,
      aiDesignPerDay: 1000,
      exportsPerDay: 500,
      uploadMaxMb: 50,
      exportMaxPx: 4096,
    },
    features: ['Unlimited-scale projects', 'Priority generation', 'Commercial workflows', 'Team asset library'],
  },
}

export function getPlan(id: string): PlanDef {
  return PLANS[(id as PlanDef['id']) in PLANS ? (id as PlanDef['id']) : 'free']
}
