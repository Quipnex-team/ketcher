# @quipnex-team/ketcher

Custom-element wrapper around [Ketcher](https://github.com/epam/ketcher) for framework-agnostic consumption.

Exposes Ketcher's React editor as `<ketcher-editor>` so Angular, Vue, or plain-HTML applications can embed it without React in their toolchain.

## Install

```bash
npm install @quipnex-team/ketcher
```

## Use

```ts
import '@quipnex-team/ketcher/web-component';
```

```html
<ketcher-editor></ketcher-editor>
```

### Attributes / properties

| Attribute | Property | Type | Default | Notes |
|---|---|---|---|---|
| `indigo-api-path` | `indigoApiPath` | `string` | `''` | If set, uses remote Indigo at this URL. Otherwise WASM-standalone is lazy-loaded. |
| `static-resources-url` | `staticResourcesUrl` | `string` | `''` | Forwarded to `<Editor staticResourcesUrl>`. |
| `disable-macromolecules` | `disableMacromolecules` | `boolean` | `true` | Hides the macromolecule mode switcher in the top toolbar. |
| — | `hiddenButtons` | `ButtonsConfig` | `{}` | Forwarded to `<Editor buttons>`. Property-only — set via JS, not attribute. |

### Methods

- `setMolecule(string)` — accepts Ket / Mol / Rxn / SMILES. Queued if called before init.
- `getKet()`, `getMolfile()`, `getRxn()` — return current structure in the requested format.
- `containsReaction()`, `isBlank()` — synchronous predicates.
- `getKetcher()` — returns the underlying `Ketcher` instance, or `null` if not yet initialized.

### Events

- `ketcher-init` — `detail: { ketcher }`. Fires once after the editor mounts.
- `ketcher-change` — `detail: {}`. Fires on every canvas change.
- `ketcher-error` — `detail: { message }`. Fires on editor errors.

## Build

```bash
npm run build
```

Produces `dist/index.js` (ESM, React bundled in, CSS injected at runtime) and `dist/index.d.ts`.

## Headless rendering

```ts
import { renderKetToSvg } from '@quipnex-team/ketcher';

const svg = await renderKetToSvg(ketString, {
  width: 240,
  height: 180,
  margins: 20,
  coloring: true,
});
```

Renders are serialized internally because the underlying worker uses a
single-listener pattern; concurrent calls would race. For dev-time trace
logging, set `window.__KETCHER_WC_DEBUG__ = true`.

## Notes

- **Light DOM** — does not use Shadow DOM. CSS from Ketcher's bundled stylesheet applies to the host page within the element's subtree. This is intentional to avoid rebinding MUI's portal `container` and Emotion's cache; a Shadow DOM variant may be added later if isolation needs warrant it.
- **Indigo provider** — when `indigoApiPath` is empty, `ketcher-standalone`'s WASM Indigo is lazy-loaded on first render.

## Attribution

`@quipnex-team/ketcher` is a derivative work of
[EPAM Ketcher](https://github.com/epam/ketcher), distributed under the
Apache License 2.0. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE)
for full terms and the list of modifications.

The `Ketcher` name is used here for technical identification only. This
package is not affiliated with, endorsed by, or sponsored by EPAM Systems,
Inc. For the official Ketcher distribution, see
https://github.com/epam/ketcher.
