import { Assets } from 'pixi.js';

export interface AssetDescriptor<TValue = unknown> {
  id: string;
  src: string;
  parser?: (resource: unknown) => TValue;
}

export class AssetLoader {
  private readonly descriptors = new Map<string, AssetDescriptor>();
  private readonly cache = new Map<string, unknown>();

  constructor(descriptors: AssetDescriptor[] = []) {
    if (descriptors.length) {
      this.registerMany(descriptors);
    }
  }

  register<TValue>(descriptor: AssetDescriptor<TValue>) {
    this.descriptors.set(descriptor.id, descriptor);
    if (!Assets.resolver.hasKey(descriptor.id)) {
      Assets.add({ alias: descriptor.id, src: descriptor.src });
    }
  }

  registerMany(descriptors: AssetDescriptor[]) {
    descriptors.forEach((descriptor) => this.register(descriptor));
  }

  has(id: string): boolean {
    return this.cache.has(id) || this.descriptors.has(id);
  }

  get<TValue>(id: string): TValue {
    if (!this.cache.has(id)) {
      throw new Error(`Asset '${id}' has not been loaded yet`);
    }
    return this.cache.get(id) as TValue;
  }

  async load<TValue>(id: string): Promise<TValue> {
    if (this.cache.has(id)) {
      return this.cache.get(id) as TValue;
    }

    const descriptor = this.descriptors.get(id);
    if (!descriptor) {
      throw new Error(`Asset '${id}' has not been registered`);
    }

    const resource = await Assets.load(descriptor.id);
    const parsed = descriptor.parser ? descriptor.parser(resource) : resource;
    this.cache.set(id, parsed);
    return parsed as TValue;
  }

  async loadAll(ids?: string[]): Promise<void> {
    const targets = ids ?? Array.from(this.descriptors.keys());
    await Promise.all(targets.map((id) => this.load(id)));
  }

  unload(id: string): void {
    this.cache.delete(id);
    Assets.unload(id);
  }

  clear(): void {
    for (const id of this.cache.keys()) {
      Assets.unload(id);
    }
    this.cache.clear();
  }
}

export function createAssetLoader(descriptors: AssetDescriptor[] = []) {
  return new AssetLoader(descriptors);
}
