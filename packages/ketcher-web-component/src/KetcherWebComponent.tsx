import { StrictMode, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Editor, type ButtonsConfig } from 'ketcher-react';
import type { Ketcher, StructServiceProvider } from 'ketcher-core';

import 'ketcher-react/dist/index.css';

type PendingState = {
  molecule?: string;
};

const OBSERVED_ATTRIBUTES = [
  'indigo-api-path',
  'static-resources-url',
  'disable-macromolecules',
] as const;

export class KetcherWebComponent extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES;
  }

  private root: Root | null = null;
  private container: HTMLDivElement | null = null;
  private ketcher: Ketcher | null = null;
  private pending: PendingState = {};
  private structServiceProvider: StructServiceProvider | null = null;
  private renderQueued = false;

  private _indigoApiPath = '';
  private _staticResourcesUrl = '';
  private _disableMacromolecules = true;
  private _hiddenButtons: ButtonsConfig = {};

  get indigoApiPath(): string {
    return this._indigoApiPath;
  }
  set indigoApiPath(value: string) {
    if (this._indigoApiPath === value) return;
    this._indigoApiPath = value;
    this.structServiceProvider = null;
    this.scheduleRender();
  }

  get staticResourcesUrl(): string {
    return this._staticResourcesUrl;
  }
  set staticResourcesUrl(value: string) {
    if (this._staticResourcesUrl === value) return;
    this._staticResourcesUrl = value;
    this.scheduleRender();
  }

  get disableMacromolecules(): boolean {
    return this._disableMacromolecules;
  }
  set disableMacromolecules(value: boolean) {
    const v = Boolean(value);
    if (this._disableMacromolecules === v) return;
    this._disableMacromolecules = v;
    this.scheduleRender();
  }

  get hiddenButtons(): ButtonsConfig {
    return this._hiddenButtons;
  }
  set hiddenButtons(value: ButtonsConfig) {
    this._hiddenButtons = value ?? {};
    this.scheduleRender();
  }

  connectedCallback(): void {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.style.cssText =
      'width:100%;height:100%;display:block;position:relative;';
    this.appendChild(this.container);
    this.root = createRoot(this.container);
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.root?.unmount();
    this.root = null;
    if (this.container?.parentNode === this) {
      this.removeChild(this.container);
    }
    this.container = null;
    this.ketcher = null;
    this.structServiceProvider = null;
    this.pending = {};
    void import('./shared-service').then(({ clearSharedServiceKetcherId }) =>
      clearSharedServiceKetcherId(),
    );
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    switch (name) {
      case 'indigo-api-path':
        this.indigoApiPath = newValue ?? '';
        break;
      case 'static-resources-url':
        this.staticResourcesUrl = newValue ?? '';
        break;
      case 'disable-macromolecules':
        this.disableMacromolecules = newValue !== null && newValue !== 'false';
        break;
    }
  }

  async setMolecule(molecule: string): Promise<void> {
    if (!this.ketcher) {
      this.pending.molecule = molecule;
      return;
    }
    await this.ketcher.setMolecule(molecule);
  }

  async getKet(): Promise<string> {
    this.assertReady();
    return this.ketcher!.getKet();
  }

  async getMolfile(): Promise<string> {
    this.assertReady();
    return this.ketcher!.getMolfile();
  }

  async getRxn(): Promise<string> {
    this.assertReady();
    return this.ketcher!.getRxn();
  }

  containsReaction(): boolean {
    return this.ketcher?.containsReaction() ?? false;
  }

  isBlank(): boolean {
    return this.ketcher?.editor.struct().isBlank() ?? true;
  }

  getKetcher(): Ketcher | null {
    return this.ketcher;
  }

  private assertReady(): void {
    if (!this.ketcher) {
      throw new Error(
        '[ketcher-editor] Ketcher is not initialized yet — wait for the "ketcher-init" event before calling this method.',
      );
    }
  }

  private scheduleRender(): void {
    if (this.renderQueued || !this.root) return;
    this.renderQueued = true;
    queueMicrotask(() => {
      this.renderQueued = false;
      void this.render();
    });
  }

  private async ensureStructServiceProvider(): Promise<StructServiceProvider> {
    if (this.structServiceProvider) return this.structServiceProvider;
    if (this._indigoApiPath) {
      const { RemoteStructServiceProvider } = await import('ketcher-core');
      this.structServiceProvider = new RemoteStructServiceProvider(
        this._indigoApiPath,
      );
    } else {
      const { getSharedStandaloneProvider } = await import('./shared-service');
      this.structServiceProvider = await getSharedStandaloneProvider();
    }
    return this.structServiceProvider;
  }

  private async render(): Promise<void> {
    if (!this.root) return;
    const provider = await this.ensureStructServiceProvider();
    if (!this.root) return;
    this.root.render(
      createElement(
        StrictMode,
        null,
        createElement(Editor, {
          errorHandler: (message: string) => {
            this.dispatchEvent(
              new CustomEvent('ketcher-error', {
                detail: { message: String(message) },
                bubbles: true,
                composed: true,
              }),
            );
          },
          buttons: this._hiddenButtons,
          staticResourcesUrl: this._staticResourcesUrl,
          structServiceProvider: provider,
          disableMacromoleculesEditor: this._disableMacromolecules,
          onInit: (ketcher: Ketcher) => this.handleInit(ketcher),
        }),
      ),
    );
  }

  private handleInit(ketcher: Ketcher): void {
    this.ketcher = ketcher;
    try {
      ketcher.editor.subscribe('change', () => {
        this.dispatchEvent(
          new CustomEvent('ketcher-change', {
            detail: {},
            bubbles: true,
            composed: true,
          }),
        );
      });
    } catch {
      // editor.subscribe surface may differ in macromolecules mode — non-fatal
    }
    this.dispatchEvent(
      new CustomEvent('ketcher-init', {
        detail: { ketcher },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.pending.molecule !== undefined) {
      const queued = this.pending.molecule;
      this.pending.molecule = undefined;
      void ketcher.setMolecule(queued).catch(() => undefined);
    }
  }
}

export function registerKetcherElement(tagName = 'ketcher-editor'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, KetcherWebComponent);
  }
}
