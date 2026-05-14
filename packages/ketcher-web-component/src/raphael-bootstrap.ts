// Ketcher's pre-bundled rendering code resolves Raphael via `window.Raphael`
// (see vite.config's post-build substitution that rewrites `require("raphael")`
// into a window lookup). Without this assignment:
//   1. Rollup would tree-shake Raphael out of the bundle entirely (no live
//      import edge), and
//   2. The runtime lookup would return null, so `new Raphael(...)` in the
//      editor's render path throws `Cp is not a constructor` under production
//      esbuild consumers (Angular --configuration production).
//
// This file is a leaf module — depends only on `raphael` — and MUST be the
// first import in `index.ts`. ES module evaluation order then guarantees:
// raphael → this module's body (sets window.Raphael) → ketcher-core's body
// (reads window.Raphael) → everything else.

import Raphael from 'raphael';

if (typeof window !== 'undefined') {
  (window as Window & { Raphael?: unknown }).Raphael = Raphael;
}
