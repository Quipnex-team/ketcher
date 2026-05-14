import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  copyFileSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  existsSync,
} from 'fs';

const PUBLIC_DTS = `// Public type surface. Internal Ketcher types are deliberately not re-exported
// from ketcher-core / ketcher-react so consumers don't need those packages
// installed — everything they need is in this file or bundled into the ES output.

/** Underlying Ketcher instance. Prefer the methods exposed on
 *  KetcherEditorElement for stable contract; deeper access via getKetcher()
 *  should be cast to ketcher-core's Ketcher type at the consumer's risk. */
export interface KetcherInstance {
  getKet(): Promise<string>;
  getMolfile(): Promise<string>;
  getRxn(): Promise<string>;
  containsReaction(): boolean;
  isBlank(): boolean;
  setMolecule(molecule: string): Promise<void>;
  [key: string]: unknown;
}

/** Map of toolbar button id → config. Pass via the hiddenButtons property. */
export type ButtonsConfig = Record<string, { hidden?: boolean }>;

export interface KetcherInitEventDetail {
  ketcher: KetcherInstance;
}

export interface KetcherErrorEventDetail {
  message: string;
}

export interface KetcherEditorElement extends HTMLElement {
  indigoApiPath: string;
  staticResourcesUrl: string;
  disableMacromolecules: boolean;
  hiddenButtons: ButtonsConfig;
  setMolecule(molecule: string): Promise<void>;
  getKet(): Promise<string>;
  getMolfile(): Promise<string>;
  getRxn(): Promise<string>;
  containsReaction(): boolean;
  isBlank(): boolean;
  getKetcher(): KetcherInstance | null;
}

export declare class KetcherWebComponent extends HTMLElement {
  indigoApiPath: string;
  staticResourcesUrl: string;
  disableMacromolecules: boolean;
  hiddenButtons: ButtonsConfig;
  setMolecule(molecule: string): Promise<void>;
  getKet(): Promise<string>;
  getMolfile(): Promise<string>;
  getRxn(): Promise<string>;
  containsReaction(): boolean;
  isBlank(): boolean;
  getKetcher(): KetcherInstance | null;
}

export declare function registerKetcherElement(tagName?: string): void;

export interface RenderToSvgOptions {
  width: number;
  height: number;
  margins?: number;
  coloring?: boolean;
}

export declare function renderKetToSvg(
  ketData: string,
  options: RenderToSvgOptions,
): Promise<string>;

declare global {
  interface HTMLElementTagNameMap {
    'ketcher-editor': KetcherEditorElement;
  }
}
`;

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    {
      name: 'emit-public-dts',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        mkdirSync(distDir, { recursive: true });
        writeFileSync(resolve(distDir, 'index.d.ts'), PUBLIC_DTS, 'utf8');
        console.log('✓ wrote dist/index.d.ts');
      },
    },
    {
      // Inlines the emitted CSS into the JS bundle, wrapped in
      // `@layer ketcher` so its `:root` variables sit below any consumer's
      // unlayered styles in the cascade. Operates on the written files in
      // closeBundle because Vite's cssCodeSplit:false emits the CSS via
      // internal post-processing that bypasses the generateBundle `bundle`.
      name: 'inject-layered-css',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const cssPath = resolve(distDir, 'ketcher-webcomponent.css');
        const jsPath = resolve(distDir, 'ketcher-webcomponent.es.js');
        if (!existsSync(cssPath) || !existsSync(jsPath)) {
          console.warn('inject-layered-css: dist files missing, skipping');
          return;
        }
        const cssContent = readFileSync(cssPath, 'utf8');
        const jsContent = readFileSync(jsPath, 'utf8');
        const layered = `@layer ketcher {\n${cssContent}\n}`;
        const injector =
          '(function(){' +
          'if(typeof document==="undefined")return;' +
          'if(document.querySelector("[data-quipnex-ketcher-styles]"))return;' +
          'var s=document.createElement("style");' +
          's.setAttribute("data-quipnex-ketcher-styles","true");' +
          's.textContent=' +
          JSON.stringify(layered) +
          ';' +
          'document.head.appendChild(s);' +
          '})();\n';
        writeFileSync(jsPath, injector + jsContent);
        unlinkSync(cssPath);
        console.log(
          '✓ inlined dist/ketcher-webcomponent.css into JS (@layer ketcher)',
        );
      },
    },
    {
      // Upstream Ketcher/Raphael ships a pre-bundled UMD file containing
      // `typeof window !== "undefined" ? require("raphael") : void 0` — a UMD
      // self-guard Rollup's commonjs plugin treats as a dynamic require and leaves
      // intact. The bare `require` then throws `ReferenceError: require is not
      // defined` under production esbuild consumers. Raphael attaches itself to
      // `window.Raphael` as a side effect, so substituting the literal with a
      // window lookup preserves behavior without polyfilling `require`.
      //
      // Post-build mutation rather than @rollup/plugin-replace because Vite's
      // commonjs plugin runs before user transforms reach this file, and the
      // alternative `enforce: 'pre'` placement was non-trivial to land reliably.
      // This is one literal substitution in one file — keeping it dumb and direct.
      name: 'neutralize-bare-require-raphael',
      closeBundle() {
        const jsPath = resolve(__dirname, 'dist/ketcher-webcomponent.es.js');
        if (!existsSync(jsPath)) return;
        const TARGET = 'require("raphael")';
        const REPLACEMENT =
          '(typeof window!=="undefined"&&window.Raphael||null)';
        let js = readFileSync(jsPath, 'utf8');
        const before = js;
        js = js.split(TARGET).join(REPLACEMENT);
        if (js !== before) {
          writeFileSync(jsPath, js);
          console.log('✓ neutralized bare require("raphael") in JS bundle');
        }
        if (js.includes(TARGET)) {
          throw new Error(
            `neutralize-bare-require-raphael: substitution failed — '${TARGET}' still present in bundle`,
          );
        }
      },
    },
  ],
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => `ketcher-webcomponent.es.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: false, drop_debugger: true },
      format: { comments: false },
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        globals: {},
        assetFileNames: 'ketcher-webcomponent.[ext]',
        inlineDynamicImports: true,
        exports: 'named',
        banner:
          'if(typeof globalThis!=="undefined"&&typeof globalThis.global==="undefined"){globalThis.global=globalThis;}',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    global: 'globalThis',
  },
});
