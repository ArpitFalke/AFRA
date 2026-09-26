# AFRA

**Create in 3D. Make it yours.**

AFRA is a premium web-based 3D creative design SaaS. Generate or build a design, edit it as a real design — every text, color and graphic on its own layer — see it on the product in 3D, then export it.

AI is an assistant. The 3D editor is the product.

---

## Current milestone — T-Shirt Studio V2

The T-shirt module has been upgraded to a professional 3D apparel design tool:

- **Parametric garment engine** (`src/lib/garment/`) — lofted cloth geometry with drape folds, shoulder shelves, ribbed collars following the scooped neckline, set-in sleeves, and baked stitched seams. Every variant (Men/Women × Oversized/Regular/Slim × Half/Full sleeve; Cropped/Boxy/Longline flagged for later) is a genuinely different mesh, rebuilt from dimension tables.
- **Zone-based printing** — six placement zones (Front, Back, Left/Right Chest, Left/Right Sleeve). Artwork is baked into each part's surface texture together with the fabric weave, so prints follow folds and lighting like real ink; a matching roughness map gives print areas a screen-print sheen. Legacy front/back documents migrate automatically.
- **Fabric system** — 7 apparel presets (Cotton, Heavy Cotton, Jersey Knit, Polyester, Performance, Soft Cotton, Washed) with procedural weave normal/roughness maps, MeshPhysicalMaterial sheen, and a custom dark-studio IBL environment (PMREM, no downloads). Controls: color, roughness, opacity + Advanced (weave type/scale, sheen, relief).
- **AI graphic generation** — "Create with AI" generates several original racing-inspired vector variations (helmet, formula car, circuit, tire, steering, speed lines, checkers) from a prompt, contrast-aware against the garment color; the chosen one becomes an editable graphic layer. With `AI_PROVIDER=openai` the same panel uses real image generation.
- **Visual model selector** — the T-shirt setup screen (new-design flow) and the editor's Garment panel show variant-accurate silhouette thumbnails.

### V1 milestone — AFRA 3D Apparel Studio

The first build target (PRD §92) is functional end-to-end:

```
Login → Dashboard → New Design → T-Shirt → 3D Editor
  → change color/material → add text/number → upload & place graphics
  → manage layers → rotate/present → save (autosave + versions) → export
```

The design engine (document model, layer system, canvas renderer, export pipeline) is product-type agnostic — Jersey, Sneaker, Livery, Poster, Album and Wallpaper plug into the same architecture (they are marked *coming soon* in the UI until their 3D models ship).

### What works today

- **Auth** — email/password (bcrypt + JWT session cookie), Google OAuth when configured, edge middleware guarding app routes.
- **Dashboard** — recent projects with generated thumbnails, search/filter, duplicate, delete, original template gallery with live-rendered previews.
- **New design flow** — pick type → start from Blank / Template / Create with AI → editor.
- **3D editor** — procedural T-shirt (no model downloads), orbit/zoom/pan, camera presets (F/B/L/R/T/360°), studio lighting presets, contact shadows, garment color + material.
- **Design system** — text (4 bundled open fonts, weights, tracking, outlines, italic, race-number styles), shapes/graphics (stripes, chevrons, bolts…), patterns (stripes, checker, dots, grid, zigzag, camo), uploaded decals. Drag layers directly on the model.
- **Layers** — select, rename, hide/show, lock, reorder, duplicate, delete; per-side (front/back).
- **Persistence** — autosave (debounced), manual save with version snapshot, version list + restore, save-state indicator, unsaved-changes guard.
- **AI** — provider abstraction (`AIProvider`); built-in deterministic local generator (no network, no key) produces structured editable layers; OpenAI-compatible provider via env config. Quota-tracked server-side.
- **Export** — 3D render PNG/JPG at HD/2K/4K with transparent/solid/custom background; production artwork export (flattened transparent design per side). Quota-tracked server-side.
- **Presentation mode** — fullscreen, chrome-free, auto-hiding controls.
- **Usage & plans** — server-enforced limits (projects, AI generations, exports, upload size) per plan; pricing config in `src/lib/plans.ts`. Billing itself is intentionally not implemented yet.

---

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript                  |
| Styling   | Tailwind CSS v4, AFRA design tokens (`globals.css`)            |
| 3D        | Three.js, @react-three/fiber, @react-three/drei                |
| State     | Zustand (editor store with undo/redo history)                  |
| Database  | PostgreSQL (target) / SQLite (local default), Prisma ORM       |
| Auth      | Custom JWT sessions (`jose`), bcryptjs, optional Google OAuth  |
| Fonts     | Inter, Bebas Neue, Saira Condensed, Archivo Black (@fontsource, offline-friendly) |

> Prisma 6 is pinned deliberately (Prisma 7's CLI is platform-oriented). The canonical schema targets **PostgreSQL** (hosted/Vercel). For local development, `scripts/prisma-setup.js` auto-derives a SQLite schema and regenerates the client based on your `DATABASE_URL` — no manual switching. It runs automatically on `postinstall`, `predev` and `prebuild`.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Minimal local development needs `DATABASE_URL` (SQLite, pre-filled) and `AUTH_SECRET` — generate one:

```bash
openssl rand -base64 32
```

All external services (Google OAuth, S3-compatible storage, AI providers, payments) are **optional** and read from environment variables. Nothing connects without configuration; see `.env.example` for the full list and [External services](#external-services) below.

### 3. Database

Local development uses SQLite automatically (`file:./dev.db`) — `npm run dev` syncs and generates the client for you:

```bash
npm run db:setup      # sync schema + generate client (also runs via predev/prebuild)
npm run db:seed       # seed the original template set
npm run db:studio     # browse data (optional)
```

For a hosted PostgreSQL (Vercel Postgres, Neon, Supabase…): set `DATABASE_URL` to the Postgres connection string, then the client targets Postgres automatically. Apply the schema with `prisma migrate dev --name init` (first time) or `prisma db push`, and `npm run db:seed`.

### 4. Run

```bash
npm run dev          # development (http://localhost:3000)
npm run build        # production build
npm run start        # production server
npm run lint         # eslint
```

---

## Project structure

```
prisma/                 schema, migrations, seed (8 original templates)
src/
  app/
    page.tsx            landing (interactive 3D hero)
    sign-in, sign-up    auth pages
    dashboard/          launchpad: recent projects, templates, new-design flow
    editor/[projectId]/ 3D editor
    api/
      auth/*            register, login, logout, me, google oauth (gated)
      projects/*        CRUD, duplicate, versions (+restore)
      assets/*          upload (validated, sanitized), library, file serving
      templates/        public template list
      ai/               generate-design (provider abstraction)
      exports/          quota check/record, usage summary
  components/
    editor/             shell, topbar, toolbar+panels, properties, export,
                        AI modal, presentation mode
    three/              procedural T-shirt, design surfaces, camera rig,
                        studio environment, export bridge
    landing/            3D hero
    auth/ shared/       auth form, logo, modal, toast, controls
    dashboard/
  lib/
    design/             DesignDocument model, canvas renderer, fonts,
                        materials, defaults, preview renderer
    ai/                 AIProvider interface + local/openai providers
    auth/               sessions, passwords
    storage/            storage adapter (local filesystem default)
    plans.ts usage.ts   server-enforced plan limits
  stores/               zustand editor store (undo/redo)
  hooks/                autosave, shortcuts, assets
  middleware.ts         route guard
```

---

## Design system

Tokens live in `src/app/globals.css` — both as Tailwind theme colors (`bg-afra-panel`, `text-afra-orange`, …) and raw CSS variables (`--afra-bg`, `--afra-orange`, …). Do not scatter raw hex values; use the tokens.

| Token      | Value     | Role                              |
| ---------- | --------- | --------------------------------- |
| bg         | `#0D0D0E` | studio environment                |
| panel      | `#141416` | panels, bars                      |
| surface    | `#18181A` | cards, inputs                     |
| white      | `#F7F5EF` | typography, primary content       |
| orange     | `#FF5A1F` | active state, primary action      |
| yellow     | `#FFD43B` | secondary accent (sparingly)      |
| muted      | `#858585` | secondary text                    |
| border     | `#252527` | hairlines                         |

The logo (`src/components/shared/AfraLogo.tsx`) is a custom geometric mark: a forward-leaning **A** whose left stroke carries a hidden **F** in its notches. Favicon: `public/favicon.svg`.

---

## The design document

A project is a **structured, editable design**, never just a rendered image. Canonical model: `src/lib/design/types.ts`.

- `DesignDocument` → garment (color/material), ordered `layers[]`, scene, lighting, metadata.
- Layers are typed (`text | graphic | shape | pattern`), positioned in a normalized design space per side (`front`/`back`).
- The renderer (`src/lib/design/render.ts`) composites layers to a canvas; that canvas textures the 3D design surface live. The same renderer powers production-artwork export and template previews.
- The editor state (`src/stores/editor-store.ts`) keeps undo/redo history and drives debounced autosave.

---

## External services

AFRA never silently connects to a service, and never invents credentials. Every integration is behind an adapter + env vars.

### Storage

Default: local filesystem adapter writing to `.data/uploads/` (gitignored), served through an authenticated route with content-type checks and SVG sanitization. To plug an S3-compatible store, implement `StorageAdapter` in `src/lib/storage/index.ts` (interface is ready) and wire the `STORAGE_*` env vars from `.env.example`.

### AI

`AIProvider` (`src/lib/ai/index.ts`) abstracts generation. Two implementations ship:

| Provider | Trigger                                   | Behavior |
| -------- | ----------------------------------------- | -------- |
| `local`  | default                                   | Deterministic offline generator — parses colors, racing/street language, names and numbers into editable layers. |
| `openai` | `AI_PROVIDER=openai` + `AI_API_KEY`       | OpenAI-compatible chat API in JSON mode, output validated into typed layers (optional `AI_BASE_URL`, `AI_MODEL`). |

Image generation only appears when the active provider supports it — no fake buttons.

### Google OAuth

Enabled automatically when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set (the sign-in page detects it server-side). Redirect URI: `{origin}/api/auth/google/callback`.

### Billing

Not implemented in this milestone — plan limits exist and are enforced, but there are no payment controls, and the pricing page shows honest "coming" states. `PAYMENT_*` env vars are reserved.

---

## Security notes

- Passwords hashed with bcrypt; sessions are signed JWTs in httpOnly, sameSite cookies.
- Uploads: MIME + magic-byte validation, size limits per plan, generated storage keys (client filenames never trusted), SVG script/event-handler stripping, nosniff + CSP on file serving.
- Authorization checked per-resource server-side (projects, assets, admin-capable role field on users).
- Usage quotas enforced server-side; frontend counters are informational only.

---

## Keyboard shortcuts

| Keys               | Action                    |
| ------------------ | ------------------------- |
| `Ctrl/Cmd + S`     | Save (+ version snapshot) |
| `Ctrl/Cmd + Z`     | Undo                      |
| `Ctrl/Cmd + ⇧ + Z` | Redo                      |
| `Ctrl/Cmd + D`     | Duplicate layer           |
| `Delete`           | Delete selected layer     |
| `F B L R T` `0`    | Front/Back/Left/Right/Top/360° |
| `Esc`              | Close modals / exit presentation |

---

## Roadmap (per PRD build order)

1. **Phase 2 — Apparel:** Jersey model + sport-specific presets.
2. **Phase 4 — Creative modules:** sneaker, car livery, poster, album cover, wallpaper on the shared engine.
3. **Phase 5 — SaaS:** billing provider, admin panel (schema + role groundwork already in place).
4. **Phase 6 — Polish:** mobile editor refinements, E2E test suite, worker-based server rendering pipeline.

---

## Rights & content

AFRA uses only original, fictional, racing-*inspired* designs and templates. No team identities, sponsor logos, driver likenesses or protected artwork are included. Users may upload assets they have the rights to use.
