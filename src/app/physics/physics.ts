export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DynamicBody extends AABB {
  readonly id: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  gravityScale: number;
  onGround: boolean;
  userData?: unknown;
}

export interface StaticBody extends AABB {
  readonly id: number;
  userData?: unknown;
}

export interface DynamicBodyInit extends Partial<Omit<DynamicBody, 'id' | 'width' | 'height' | 'gravityScale' | 'onGround'>> {
  x: number;
  y: number;
  width: number;
  height: number;
  gravityScale?: number;
  userData?: unknown;
}

export interface StaticBodyInit extends Omit<StaticBody, 'id'> {}

export interface PhysicsWorldOptions {
  cellSize?: number;
  gravity?: { x?: number; y?: number };
}

export interface PhysicsWorld {
  addDynamicBody(init: DynamicBodyInit): DynamicBody;
  addStaticBody(init: StaticBodyInit): StaticBody;
  removeDynamicBody(id: number): void;
  clear(): void;
  step(dt: number): void;
  getDynamicBodies(): Iterable<DynamicBody>;
  getStaticBodies(): Iterable<StaticBody>;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

class SpatialHash<T extends AABB> {
  private readonly cells = new Map<string, Set<T>>();

  constructor(private readonly cellSize: number) {}

  add(item: T) {
    for (const key of this.keysFor(item)) {
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = new Set<T>();
        this.cells.set(key, bucket);
      }
      bucket.add(item);
    }
  }

  remove(item: T) {
    for (const key of this.keysFor(item)) {
      const bucket = this.cells.get(key);
      if (!bucket) {
        continue;
      }
      bucket.delete(item);
      if (bucket.size === 0) {
        this.cells.delete(key);
      }
    }
  }

  query(area: AABB): Set<T> {
    const results = new Set<T>();
    for (const key of this.keysFor(area)) {
      const bucket = this.cells.get(key);
      if (!bucket) {
        continue;
      }
      for (const item of bucket) {
        results.add(item);
      }
    }
    return results;
  }

  private keysFor(bounds: AABB): string[] {
    const keys: string[] = [];
    const minX = Math.floor(bounds.x / this.cellSize);
    const maxX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const minY = Math.floor(bounds.y / this.cellSize);
    const maxY = Math.floor((bounds.y + bounds.height) / this.cellSize);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        keys.push(`${x}:${y}`);
      }
    }

    return keys;
  }
}

export function createPhysicsWorld(options: PhysicsWorldOptions = {}): PhysicsWorld {
  const cellSize = options.cellSize ?? 256;
  const gravityX = options.gravity?.x ?? 0;
  const gravityY = options.gravity?.y ?? 0;

  let nextId = 1;
  const dynamicBodies = new Map<number, DynamicBody>();
  const staticBodies = new Map<number, StaticBody>();
  const spatialHash = new SpatialHash<StaticBody>(cellSize);

  const addStaticBody = (init: StaticBodyInit): StaticBody => {
    const body: StaticBody = {
      id: nextId++,
      x: init.x,
      y: init.y,
      width: init.width,
      height: init.height,
      userData: init.userData
    };
    staticBodies.set(body.id, body);
    spatialHash.add(body);
    return body;
  };

  const addDynamicBody = (init: DynamicBodyInit): DynamicBody => {
    const body: DynamicBody = {
      id: nextId++,
      x: init.x,
      y: init.y,
      width: init.width,
      height: init.height,
      vx: init.vx ?? 0,
      vy: init.vy ?? 0,
      ax: init.ax ?? 0,
      ay: init.ay ?? 0,
      gravityScale: init.gravityScale ?? 1,
      onGround: false,
      userData: init.userData
    };
    dynamicBodies.set(body.id, body);
    return body;
  };

  const removeDynamicBody = (id: number) => {
    dynamicBodies.delete(id);
  };

  const clear = () => {
    dynamicBodies.clear();
    staticBodies.clear();
    nextId = 1;
  };

  const queryStatics = (body: AABB): StaticBody[] => {
    const candidates = spatialHash.query(body);
    return Array.from(candidates);
  };

  const resolveAxis = (body: DynamicBody, delta: number, axis: 'x' | 'y') => {
    if (delta === 0) {
      return;
    }

    if (axis === 'x') {
      body.x += delta;
    } else {
      body.y += delta;
    }

    let collided = false;
    do {
      collided = false;
      const statics = queryStatics(body);
      for (const solid of statics) {
        if (!aabbOverlap(body, solid)) {
          continue;
        }

        if (axis === 'x') {
          if (delta > 0) {
            body.x = solid.x - body.width;
          } else {
            body.x = solid.x + solid.width;
          }
          body.vx = 0;
          collided = true;
        } else {
          if (delta > 0) {
            body.y = solid.y - body.height;
            body.vy = 0;
            body.onGround = true;
          } else {
            body.y = solid.y + solid.height;
            body.vy = 0;
          }
          collided = true;
        }
      }
    } while (collided);
  };

  const step = (dt: number) => {
    if (dt <= 0) {
      return;
    }

    for (const body of dynamicBodies.values()) {
      body.vx += (body.ax + gravityX) * dt;
      body.vy += (body.ay + gravityY * body.gravityScale) * dt;

      const dx = body.vx * dt;
      const dy = body.vy * dt;

      if (dx !== 0) {
        resolveAxis(body, dx, 'x');
      }

      body.onGround = false;

      if (dy !== 0) {
        resolveAxis(body, dy, 'y');
      }
    }
  };

  return {
    addDynamicBody,
    addStaticBody,
    removeDynamicBody,
    clear,
    step,
    getDynamicBodies() {
      return dynamicBodies.values();
    },
    getStaticBodies() {
      return staticBodies.values();
    }
  };
}
