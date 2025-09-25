/**
 * Minimal Entity Component Store (ECS)
 * -----------------------------------
 *
 * The goal for this ECS is to provide a tiny, data-first runtime that keeps the API ergonomic
 * while maintaining predictable iteration order (component stores are Maps keyed by entity id).
 *
 * A `World` manages entity lifecycles and component stores. Components are defined up-front via
 * `defineComponent`, which returns a component descriptor used to add, read, or remove data for
 * entities. The descriptor carries a factory for default values so component payloads are always
 * fully populated.
 *
 * Systems can iterate over entities by composing queries. A query is simply the list of component
 * types you care about. Internally the world walks the smallest component store to minimise work,
 * yielding each entity along with references to its component data.
 */

export type Entity = number;

export interface ComponentDescriptor<T> {
  readonly id: symbol;
  readonly name: string;
  create(initial?: Partial<T>): T;
}

export type ComponentInstance<C> = C extends ComponentDescriptor<infer T> ? T : never;

type ComponentStore = Map<Entity, unknown>;

export class World {
  private nextEntity = 1;
  private readonly alive = new Set<Entity>();
  private readonly stores = new Map<symbol, ComponentStore>();

  /** Create a new entity identifier and mark it as alive. */
  createEntity(): Entity {
    const id = this.nextEntity++;
    this.alive.add(id);
    return id;
  }

  /**
   * Destroy an entity and remove all component data associated with it. Component stores are kept
   * around; only the slots for the entity are cleared.
   */
  destroyEntity(entity: Entity): void {
    if (!this.alive.delete(entity)) {
      return;
    }
    for (const store of this.stores.values()) {
      store.delete(entity);
    }
  }

  /**
   * Register a component on the entity. Component data is cloned from the descriptor's defaults and
   * shallow-merged with the provided partial value. The fully-initialised component is returned.
   */
  addComponent<T>(entity: Entity, descriptor: ComponentDescriptor<T>, value?: Partial<T>): T {
    this.assertAlive(entity);
    const store = this.ensureStore(descriptor);
    const data = descriptor.create(value);
    store.set(entity, data as unknown);
    return data;
  }

  /** Retrieve a component if it exists. */
  getComponent<T>(entity: Entity, descriptor: ComponentDescriptor<T>): T | undefined {
    const store = this.stores.get(descriptor.id);
    return (store?.get(entity) as T | undefined) ?? undefined;
  }

  /** Check for component existence without materialising the payload. */
  hasComponent<T>(entity: Entity, descriptor: ComponentDescriptor<T>): boolean {
    return this.stores.get(descriptor.id)?.has(entity) ?? false;
  }

  /** Remove a component from the entity if present. */
  removeComponent<T>(entity: Entity, descriptor: ComponentDescriptor<T>): boolean {
    const store = this.stores.get(descriptor.id);
    return store ? store.delete(entity) : false;
  }

  /** Total number of alive entities. */
  entityCount(): number {
    return this.alive.size;
  }

  /** Iterator over alive entity ids. */
  entities(): Iterable<Entity> {
    return this.alive.values();
  }

  /** Remove all entities and component data. */
  clear(): void {
    this.alive.clear();
    for (const store of this.stores.values()) {
      store.clear();
    }
    this.nextEntity = 1;
  }

  /** Execute a query, if a callback is provided the results are streamed into it, otherwise an array is returned. */
  query<Components extends readonly ComponentDescriptor<any>[]>(
    components: Components,
    callback?: (
      entity: Entity,
      components: { [Index in keyof Components]: ComponentInstance<Components[Index]> }
    ) => void
  ): Array<{ entity: Entity; components: { [Index in keyof Components]: ComponentInstance<Components[Index]> } }> {
    if (components.length === 0) {
      throw new Error('World.query must receive at least one component descriptor');
    }

    const stores = components.map((component) => this.ensureStore(component));
    const primaryStore = this.getSmallestStore(stores);
    const results: Array<{ entity: Entity; components: any }> = [];

    for (const [entity] of primaryStore) {
      if (!this.alive.has(entity)) {
        continue;
      }

      let passes = true;
      const tuple: any[] = [];
      for (let i = 0; i < components.length; i += 1) {
        const store = stores[i];
        const value = store.get(entity);
        if (value === undefined) {
          passes = false;
          break;
        }
        tuple[i] = value;
      }

      if (!passes) {
        continue;
      }

      if (callback) {
        callback(entity, tuple as any);
      } else {
        results.push({ entity, components: tuple as any });
      }
    }

    if (callback) {
      return [];
    }

    return results;
  }

  private getSmallestStore(stores: ComponentStore[]): ComponentStore {
    let smallest = stores[0];
    for (let i = 1; i < stores.length; i += 1) {
      if (stores[i].size < smallest.size) {
        smallest = stores[i];
      }
    }
    return smallest;
  }

  private ensureStore<T>(descriptor: ComponentDescriptor<T>): ComponentStore {
    let store = this.stores.get(descriptor.id);
    if (!store) {
      store = new Map<Entity, T>();
      this.stores.set(descriptor.id, store);
    }
    return store;
  }

  private assertAlive(entity: Entity) {
    if (!this.alive.has(entity)) {
      throw new Error(`Entity ${entity} is not alive in this world`);
    }
  }
}

/** Helper to define a component descriptor with a default factory. */
export function defineComponent<T>(name: string, defaults: () => T): ComponentDescriptor<T> {
  return {
    id: Symbol(name),
    name,
    create(initial?: Partial<T>): T {
      if (!initial) {
        return defaults();
      }
      return { ...defaults(), ...initial };
    }
  };
}

/** Utility type to map component descriptors to their instance data tuple. */
export type QueryComponents<
  Components extends readonly ComponentDescriptor<any>[]
> = { [Index in keyof Components]: ComponentInstance<Components[Index]> };

/** Convenience helper to iterate queries with a generator. */
export function* queryIterator<Components extends readonly ComponentDescriptor<any>[]>(
  world: World,
  components: Components
): Generator<{ entity: Entity; components: QueryComponents<Components> }, void, undefined> {
  const results = world.query(components);
  for (const result of results) {
    yield result as { entity: Entity; components: QueryComponents<Components> };
  }
}
