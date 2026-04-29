# Rhythm Exercise (Polyrhythm Trainer)

Interactive browser-based polyrhythm trainer built with Next.js, React, TypeScript, and VexFlow.

## What it does

- Build multiple rhythm voices with per-token duration, rests, dots, and tuplets.
- See notation and an aligned denominator grid across all voices.
- Play back the full cycle with voice muting, metronome options, repeat mode, and swing.
- Persist editor state in `localStorage` so work survives refreshes.

## Tech stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- VexFlow
- Vitest + ESLint

## Local development

Requirements:

- Node.js 20+
- pnpm 10+

Install and run:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
pnpm dev    # Start local dev server
pnpm lint   # Run ESLint
pnpm test   # Run unit tests
pnpm build  # Production build (static export)
pnpm start  # Serve production build (when applicable)
```

## Deployment (Vercel)

This app is configured for static export via `next.config.ts`:

```ts
output: "export";
```

That means Vercel will deploy it as a static site generated at build time.

### One-time setup

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, click **Add New Project** and import the repo.
3. Keep the framework as **Next.js**.
4. Keep defaults (Vercel should detect):
   - Install Command: `pnpm install`
   - Build Command: `pnpm build`
   - Output Directory: `out`
5. Click **Deploy**.

### Subsequent deploys

- Every push to your production branch triggers a new deployment automatically.

## Verification checklist before deploy

- `pnpm lint` passes
- `pnpm test` passes
- `pnpm build` passes

Current status in this repository: all three checks pass.
