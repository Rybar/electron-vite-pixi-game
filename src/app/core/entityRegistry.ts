export type EntityKind = string;

export interface EntityRecord<TData = unknown> {
  id: number;
  kind: EntityKind;
  data: TData;
  tags: ReadonlySet<string>;
}

export interface AddEntityOptions {
  tags?: Iterable<string>;
}

export class EntityRegistry {
  private nextId = 1;
  private readonly byId = new Map<number, EntityRecord>();
  private readonly byKind = new Map<EntityKind, Set<number>>();

  add<TData>(kind: EntityKind, data: TData, options: AddEntityOptions = {}): EntityRecord<TData> {
    const id = this.nextId++;
    const tags = new Set(options.tags ?? []);
    const record: EntityRecord<TData> = { id, kind, data, tags };

    this.byId.set(id, record);

    if (!this.byKind.has(kind)) {
      this.byKind.set(kind, new Set());
    }
    this.byKind.get(kind)!.add(id);

    return record;
  }

  get<TData = unknown>(id: number): EntityRecord<TData> | undefined {
    return this.byId.get(id) as EntityRecord<TData> | undefined;
  }

  getByKind<TData = unknown>(kind: EntityKind): EntityRecord<TData>[] {
    const ids = this.byKind.get(kind);
    if (!ids) {
      return [];
    }
    return Array.from(ids, (entityId) => this.byId.get(entityId) as EntityRecord<TData>);
  }

  remove(id: number): boolean {
    const record = this.byId.get(id);
    if (!record) {
      return false;
    }

    this.byId.delete(id);

    const ids = this.byKind.get(record.kind);
    ids?.delete(id);
    if (ids && ids.size === 0) {
      this.byKind.delete(record.kind);
    }

    return true;
  }

  clear(): void {
    this.byId.clear();
    this.byKind.clear();
    this.nextId = 1;
  }

  count(kind?: EntityKind): number {
    if (typeof kind === 'string') {
      return this.byKind.get(kind)?.size ?? 0;
    }
    return this.byId.size;
  }

  snapshotCounts(): Record<EntityKind, number> {
    const result: Record<EntityKind, number> = {};
    for (const [kind, ids] of this.byKind.entries()) {
      result[kind] = ids.size;
    }
    return result;
  }

  forEach<TData>(kind: EntityKind, fn: (record: EntityRecord<TData>) => void): void {
    const ids = this.byKind.get(kind);
    if (!ids) {
      return;
    }
    for (const id of ids) {
      const record = this.byId.get(id) as EntityRecord<TData> | undefined;
      if (record) {
        fn(record);
      }
    }
  }
}
