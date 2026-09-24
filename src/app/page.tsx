import Link from 'next/link'
import { AfraLogo } from '@/components/shared/AfraLogo'
import { getCurrentUser } from '@/lib/auth/session'
import { HeroClient } from '@/components/landing/HeroClient'

export const metadata = { title: 'AFRA — Create in 3D. Make it yours.' }

const CATEGORIES = [
  { name: 'T-Shirts', status: 'live' },
  { name: 'Jerseys', status: 'soon' },
  { name: 'Sneakers', status: 'soon' },
  { name: 'Car Liveries', status: 'soon' },
  { name: 'Posters', status: 'soon' },
  { name: 'Album Covers', status: 'soon' },
]

export default async function LandingPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-afra-border/70 bg-afra-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="AFRA">
            <AfraLogo size={22} />
          </Link>
          <nav className="hidden items-center gap-7 text-xs text-afra-muted md:flex">
            <a href="#categories" className="transition-colors hover:text-afra-white">Products</a>
            <a href="#workflow" className="transition-colors hover:text-afra-white">AI Workflow</a>
            <a href="#pricing" className="transition-colors hover:text-afra-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-primary h-8 px-4 text-xs">
                Open Studio
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="btn-ghost h-8 px-3 text-xs">
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn-primary h-8 px-4 text-xs">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-afra-orange/[0.055] blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div className="relative z-10 text-center lg:text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-afra-border px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-afra-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-afra-orange" />
              3D creative studio
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Create in 3D.
              <br />
              <span className="text-afra-orange">Make it yours.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-afra-muted lg:mx-0">
              Generate or build a design, edit it as a real design — every text, color and graphic on its own layer — see it on the product in
              3D, then export it. AI assists. The 3D editor is the product.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href={user ? '/dashboard' : '/sign-up'} className="btn-primary px-6 py-2.5 text-sm">
                {user ? 'Open your studio' : 'Start creating — free'}
              </Link>
              <a href="#categories" className="btn-outline px-5 py-2.5 text-sm">
                Explore what you can make
              </a>
            </div>
            <p className="mt-4 text-[11px] text-afra-muted/70">Drag the shirt. Everything on it is editable in the studio.</p>
          </div>
          <div className="relative h-[380px] sm:h-[460px] lg:h-[560px]">
            <HeroClient />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="border-t border-afra-border/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">One engine. Many canvases.</h2>
          <p className="mt-2 max-w-lg text-sm text-afra-muted">
            The AFRA Design Engine drives every category from a single document model. Apparel is live today — the rest are on the grid.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <div
                key={c.name}
                className={`rounded-xl border p-5 text-center ${
                  c.status === 'live' ? 'border-afra-orange/50 bg-afra-panel' : 'border-afra-border bg-afra-panel/50'
                }`}
              >
                <div className={`text-sm font-medium ${c.status === 'live' ? 'text-afra-white' : 'text-afra-muted'}`}>{c.name}</div>
                <div className={`mt-1.5 text-[9px] uppercase tracking-[0.18em] ${c.status === 'live' ? 'text-afra-orange' : 'text-afra-muted/60'}`}>
                  {c.status === 'live' ? 'Live now' : 'Coming soon'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI workflow */}
      <section id="workflow" className="border-t border-afra-border/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">AI assists. You design.</h2>
          <p className="mt-2 max-w-lg text-sm text-afra-muted">
            Describe a direction and AFRA builds it as structured, editable layers — not a flat image you&apos;re stuck with.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Prompt',
                body: '“Black racing tee with orange aerodynamic stripes and number 27.” The engine reads colors, sport language, names and numbers.',
              },
              {
                step: '02',
                title: 'Structured design',
                body: 'You get real layers — stripes, wordmarks, numbers — placed on the product in 3D. Every property stays editable.',
              },
              {
                step: '03',
                title: 'Own it',
                body: 'Move it, recolor it, delete it, rebuild it. Then present it fullscreen and export renders or production artwork.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-afra-border bg-afra-panel p-6">
                <div className="text-xs font-bold text-afra-orange">{s.step}</div>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-afra-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editor highlights */}
      <section className="border-t border-afra-border/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">A serious 3D editor.</h2>
              <p className="mt-3 text-sm leading-relaxed text-afra-muted">
                Orbit, zoom and inspect from every angle. Place graphics directly on the model. Manage layers with visibility, lock and
                reorder. Tune materials, studio lighting and shadows. Autosave keeps every change.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-afra-white/85">
                {[
                  'Layer system with select, hide, lock, reorder, duplicate',
                  'Text engine: fonts, weights, tracking, outlines, race numbers',
                  'Patterns, shapes and your own uploaded artwork',
                  'Camera presets, presentation mode, 4K export',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-afra-orange" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-2xl border border-afra-border bg-afra-panel p-1">
              <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-afra-muted">
{`┌──────────────────────────────────────────────────────┐
│ AFRA   Midnight Circuit            Saved   Export    │
├─────────┬─────────────────────────────┬──────────────┤
│ DESIGN  │                             │ PROPERTIES   │
│ Templates│        /  3D canvas       \\│ Transform    │
│ Text    │      the shirt is the      │ Appearance   │
│ Graphics│         interface          │ Materials    │
│ Layers  │                             │ Lighting     │
├─────────┴─────────────────────────────┴──────────────┤
│ Front  Back  Left  Right  Top  360°          Zoom    │
└──────────────────────────────────────────────────────┘`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-afra-border/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">Plans</h2>
          <p className="mt-2 text-sm text-afra-muted">Start free. Billing arrives with the Pro launch — no card needed today.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { name: 'Free', price: '$0', tag: 'Start creating in 3D.', features: ['3 projects', '15 AI generations / day', 'HD exports up to 2K', 'Full T-shirt editor'], highlight: false },
              { name: 'Pro', price: 'TBA', tag: 'For serious creators.', features: ['50 projects', '200 AI generations / day', '4K exports', 'Premium templates'], highlight: true },
              { name: 'Studio', price: 'TBA', tag: 'For teams and studios.', features: ['Large-scale projects', 'Priority generation', 'Commercial workflows', 'Team asset library'], highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-6 ${p.highlight ? 'border-afra-orange/60 bg-afra-panel' : 'border-afra-border bg-afra-panel/60'}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-afra-orange px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                    Coming
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-xs text-afra-muted">{p.tag}</p>
                <div className="mt-4 text-2xl font-bold">{p.price}</div>
                <ul className="mt-4 space-y-2 text-[13px] text-afra-white/80">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-afra-muted" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-afra-border/60 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Idea → 3D → Export.</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-afra-muted">Without leaving the studio. Your first design takes minutes.</p>
        <Link href={user ? '/dashboard' : '/sign-up'} className="btn-primary mt-7 px-7 py-3 text-sm">
          {user ? 'Open your studio' : 'Create your first design'}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-afra-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <AfraLogo size={18} />
          <p className="text-[11px] text-afra-muted">
            © {new Date().getFullYear()} AFRA. Racing-inspired design tools — not affiliated with any motorsport team or series.
          </p>
          <div className="flex gap-4 text-[11px] text-afra-muted">
            <Link href="/sign-up" className="hover:text-afra-white">Get started</Link>
            <a href="#pricing" className="hover:text-afra-white">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
