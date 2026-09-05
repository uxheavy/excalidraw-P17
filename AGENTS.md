# Guidelines

- For new DOM/browser API usage, use `app.ownerDocument` and `app.ownerWindow` instead of globals; without `app`, derive them from the mounted node's `ownerDocument` and its `defaultView`.

## Host boundary and ownership

This package owns native Excalidraw scene arrangement, hit testing, selection, history, keyboard/focus/accessibility behavior, and host rendering. The public host seam is [`types.ts`](packages/excalidraw/types.ts), passed through [`index.tsx`](packages/excalidraw/index.tsx) and rendered by [`App.tsx`](packages/excalidraw/components/App.tsx). Host applications own domain records, authorization, hydration, and persistence; do not duplicate those owners here.

`renderHostElement` projects host-owned content for visible non-URL native elements. Returning content registers that element as a host surface: it is drawn above the canvas and below native embeds, follows the native element transform and opacity (including image flips), and preserves scene order among host surfaces. Returning `null` leaves the native element unchanged. The public callback does not define caller metadata or source-record semantics. Host overlay containers in [`styles.scss`](packages/excalidraw/css/styles.scss) have `pointer-events: none`; keep interaction at this shared editor seam and reuse the editor's existing selection and hit testing before introducing per-source event or geometry code.

Acceptance provisioning, receipts, and cleanup belong to the external Plane Runner's `tests/acceptance/runner/` lifecycle; this repository supplies the editor package and its checks.

## Verification map

The root [`package.json`](package.json) owns the canonical Vitest entry point: use `yarn test:app --run <focused test paths>` for package-level proof.
