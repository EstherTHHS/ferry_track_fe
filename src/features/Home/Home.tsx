/**
 * Renders the Ferry Track landing placeholder. Mounted directly by
 * `src/app/page.tsx` — the root route's only job is fetching or composing
 * a real dashboard once the ferry-tracking data model exists.
 *
 * @remarks
 * Status: stable — Type: feature
 *
 * State & behavior: static, no props, no fetching, no client state.
 *
 * Variants: single default appearance — no variants yet.
 *
 * Composition: renders no children, requires no provider.
 *
 * Accessibility: heading uses a native `h1`, giving the page its one
 * top-level landmark heading.
 *
 * Test ids: root `home-root`, heading `home-title`.
 *
 * CSS classes: `home` (root block), `home__title` (heading element).
 *
 * Edge cases: none — content is static.
 *
 * Dependencies: none.
 *
 * @example
 * ```tsx
 * <Home />
 * ```
 */
export default function Home() {
  return (
    <div className="home" data-testid="home-root">
      <h1 className="home__title" data-testid="home-title">
        Ferry Track
      </h1>
    </div>
  );
}
