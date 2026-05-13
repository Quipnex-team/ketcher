import { getSharedStandaloneService } from './shared-service';

export interface RenderToSvgOptions {
  width: number;
  height: number;
  margins?: number;
  coloring?: boolean;
}

// Toggle in DevTools via `window.__KETCHER_WC_DEBUG__ = true` to enable
// per-render trace logs. Errors always surface regardless.
function isDebug(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    (globalThis as { __KETCHER_WC_DEBUG__?: boolean }).__KETCHER_WC_DEBUG__ ===
      true
  );
}

// ketcher-standalone's worker uses `EE.once(...)`, consumed on the first
// response regardless of inputData match. Concurrent calls hang all but one.
let chain: Promise<unknown> = Promise.resolve();

export async function renderKetToSvg(
  ketData: string,
  options: RenderToSvgOptions,
): Promise<string> {
  const callId = isDebug() ? Math.random().toString(36).slice(2, 7) : '';
  if (isDebug()) {
    console.log(
      `[ketcher-wc] render[${callId}] queued (len=${ketData.length})`,
    );
  }
  const task = chain.then(
    () => doRender(callId, ketData, options),
    () => doRender(callId, ketData, options),
  );
  chain = task.catch(() => undefined);
  return task;
}

async function doRender(
  callId: string,
  ketData: string,
  options: RenderToSvgOptions,
): Promise<string> {
  const debug = isDebug();
  const start = debug ? performance.now() : 0;
  if (debug) console.log(`[ketcher-wc] render[${callId}] starting`);
  const service = await getSharedStandaloneService();
  try {
    const result = await service.generateImageAsBase64(ketData, {
      outputFormat: 'svg',
      'render-image-size': `${options.width}, ${options.height}`,
      'render-margins': `${options.margins ?? 20}, ${options.margins ?? 20}`,
      'render-coloring': options.coloring ?? true,
    });
    if (debug) {
      const elapsed = (performance.now() - start).toFixed(0);
      console.log(`[ketcher-wc] render[${callId}] success in ${elapsed}ms`);
    }
    try {
      return atob(result);
    } catch {
      return result;
    }
  } catch (err) {
    const elapsed = debug ? (performance.now() - start).toFixed(0) : '?';
    console.error(
      `[ketcher-wc] render[${callId || '-'}] failed after ${elapsed}ms`,
      err,
    );
    throw err;
  }
}
