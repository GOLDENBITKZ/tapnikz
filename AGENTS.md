<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Server vs Client Components — CRITICAL RULES

**Before touching any file in `src/app/` or `src/components/`, check whether it is a Server Component or Client Component.**

### Server Components (no `'use client'` at top)
Files: `src/app/[username]/page.tsx`, `src/app/discover/page.tsx`, `src/app/page.tsx`, all static landing pages, all `layout.tsx`.

**FORBIDDEN in Server Components:**
- `onClick`, `onChange`, `onSubmit`, `onError`, `onLoad`, or ANY event handler prop on JSX elements
- `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, or ANY React hook
- `window.*`, `document.*`, `localStorage`, `sessionStorage`, `navigator.*`
- `'use client'` components that accept function props from a Server Component parent

**If you need interactivity in a Server Component:** create a NEW small `'use client'` component in `src/components/` that wraps the interactive part. Import and use it.

**Why:** React serializes Server Component output to send to the browser. Functions (event handlers) cannot be serialized → runtime crash: `"Event handlers cannot be passed to Client Component props"`. This crashes the page for every visitor.

### Client Components (`'use client'` at top)
Files: `src/app/dashboard/page.tsx`, `src/app/auth/page.tsx`, `src/app/pay/page.tsx`, `src/app/manager/page.tsx`, `src/app/partners/page.tsx`, and any component in `src/components/` that uses hooks.

All hooks and event handlers are allowed here.

### Route Handlers (`src/app/api/*/route.ts`, `src/app/qr/*/route.ts`)
These are Node.js functions, not React components. `document.*` / `window.*` inside template string HTML responses is fine (it runs in the browser after being sent). No hooks or JSX here.

### Next.js 15 — `params` must be awaited
```ts
// CORRECT
type Props = { params: Promise<{ username: string }> }
export default async function Page({ params }: Props) {
  const { username } = await params  // ← must await
}
```

### JSON-LD with user data — must escape
```tsx
// CORRECT (prevents script injection if field contains </script>)
<script type="application/ld+json" dangerouslySetInnerHTML={{
  __html: JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f')
}} />
```
