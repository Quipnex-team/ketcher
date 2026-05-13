import type { Ketcher } from 'ketcher-core';
import type { ButtonsConfig } from 'ketcher-react';

export interface KetcherInitEventDetail {
  ketcher: Ketcher;
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
  getKetcher(): Ketcher | null;
  addEventListener(
    type: 'ketcher-init',
    listener: (e: CustomEvent<KetcherInitEventDetail>) => void,
  ): void;
  addEventListener(
    type: 'ketcher-change',
    listener: (e: CustomEvent<Record<string, never>>) => void,
  ): void;
  addEventListener(
    type: 'ketcher-error',
    listener: (e: CustomEvent<KetcherErrorEventDetail>) => void,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'ketcher-editor': KetcherEditorElement;
  }
}

export {};
