// MUST be the first import so its module body executes before any of
// KetcherWebComponent's transitive imports (in particular ketcher-core's
// pre-bundled `var raphaelModule = window.Raphael || null` line).
import './raphael-bootstrap';
import {
  KetcherWebComponent,
  registerKetcherElement,
} from './KetcherWebComponent';

registerKetcherElement('ketcher-editor');

export { KetcherWebComponent, registerKetcherElement };
export type {
  KetcherEditorElement,
  KetcherInitEventDetail,
  KetcherErrorEventDetail,
} from './types';
