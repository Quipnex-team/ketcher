import {
  KetcherWebComponent,
  registerKetcherElement,
} from './KetcherWebComponent';

registerKetcherElement('ketcher-editor');

export { KetcherWebComponent, registerKetcherElement };
export { renderKetToSvg } from './render';
export type { RenderToSvgOptions } from './render';
export type {
  KetcherEditorElement,
  KetcherInitEventDetail,
  KetcherErrorEventDetail,
} from './types';
