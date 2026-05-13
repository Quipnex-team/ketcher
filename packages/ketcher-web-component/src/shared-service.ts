import type {
  ServiceMode,
  StructService,
  StructServiceOptions,
  StructServiceProvider,
} from 'ketcher-core';

// ketcher-standalone's worker is a module-level singleton, and each
// StandaloneStructService constructor overwrites `worker.onmessage`. If we
// create two services (one for the editor, one for headless rendering),
// the latter overwrites the former and pending calls on the orphaned
// service hang forever. To avoid this, we share a single service instance
// across the entire wrapper — both the editor and renderKetToSvg use it.

let servicePromise: Promise<StructService> | null = null;

export async function getSharedStandaloneService(): Promise<StructService> {
  if (!servicePromise) {
    servicePromise = (async () => {
      const mod = await import('ketcher-standalone');
      const provider = new mod.StandaloneStructServiceProvider();
      return provider.createStructService({});
    })();
  }
  return servicePromise;
}

class SharedStandaloneProvider implements StructServiceProvider {
  mode: ServiceMode = 'standalone';
  constructor(private readonly service: StructService) {}
  createStructService(_options: StructServiceOptions): StructService {
    return this.service;
  }
}

export async function getSharedStandaloneProvider(): Promise<StructServiceProvider> {
  const service = await getSharedStandaloneService();
  return new SharedStandaloneProvider(service);
}

// Editor mount calls service.addKetcherId(<id>). On unmount, the editor is
// destroyed (ketcherProvider.removeKetcherInstance is called) but the
// service's ketcherId field is not reset. Subsequent service operations
// look up a stale id and throw. Call this from the editor wrapper's
// disconnectedCallback to keep the shared service clean.
export async function clearSharedServiceKetcherId(): Promise<void> {
  if (!servicePromise) return;
  const service = await servicePromise;
  // ketcherId is a private field; the addKetcherId setter is the public API
  // but accepts only strings. We need to clear it, so reach in directly.
  (service as unknown as { ketcherId: string | null }).ketcherId = null;
}
