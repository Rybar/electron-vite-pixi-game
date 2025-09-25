# Minimal ECS Guide

This project now ships with a lightweight Entity Component Store (ECS) that lives in
`src/app/core/ecs.ts`. The implementation is intentionally small so it remains easy to reason
about while providing the building blocks needed for future growth.

The ECS revolves around three core concepts:

1. **World** – container responsible for entity lifecycles and component storage.
2. **Component** – structured data attached to entities. Defined once up-front via `defineComponent`.
3. **Query** – ad-hoc view over entities that carry a specific set of components.

Below is a walkthrough of the API together with practical tips.

## World lifecycle

```ts
import { World } from '../core/ecs';

const world = new World();
const player = world.createEntity();
// ... add components, run systems, etc.
world.destroyEntity(player);
```

Entity identifiers are simple integers. The world recycles nothing yet (numbers only ever increase),
which keeps bookkeeping trivial. `world.entityCount()` returns how many entities are currently alive.

Calling `world.clear()` wipes every entity and component store – handy for scene resets.

## Defining components

Components are created through `defineComponent(name, defaults)` where `defaults` is a factory that
returns the fully-initialised data shape. When attaching a component you can pass a partial override;
anything you omit falls back to those defaults.

```ts
import { defineComponent } from '../core/ecs';

type TransformData = { x: number; y: number };
export const Transform = defineComponent<TransformData>('Transform', () => ({ x: 0, y: 0 }));

const player = world.createEntity();
world.addComponent(player, Transform, { x: 100, y: 220 });
```

Internally each component owns a Map keyed by entity id. This keeps iteration predictable and cheap.

### Reading, writing, removing

```ts
const transform = world.getComponent(player, Transform);
if (transform) {
  transform.x += 10;
}

const removed = world.removeComponent(player, Transform); // -> true if it existed
```

Component payloads are regular objects; mutate them directly for hot-path updates. If you prefer
immutability you can always replace the stored value with `world.addComponent(entity, Component, {...})`
again.

## Querying entities

Queries are scoped to the components you list. Under the hood the world picks the smallest
component store as the primary iteration set to keep scans tight.

```ts
import { queryIterator } from '../core/ecs';

for (const { entity, components: [transform, physics] } of queryIterator(world, [Transform, Physics])) {
  // transform and physics are strongly-typed
  // do work...
}
```

Alternatively, supply a callback to `world.query([Transform, Physics], (entity, [transform, physics]) => { ... });`
which streams results without allocating an array.

## Building systems

Systems are plain functions that receive the world (and any dependencies they need) then walk the
relevant query. Example: a basic physics integration could look like this:

```ts
export function integrate(world: World, dt: number) {
  world.query([Transform, Velocity], (entity, [transform, velocity]) => {
    transform.x += velocity.x * dt;
    transform.y += velocity.y * dt;
  });
}
```

Because component payloads are mutably shared, updates land immediately and the next system can rely
on the new values.

## Scene integration

`DemoScene` now drives player/dummy entities through the ECS. Each game object is an entity with a
mix of:

- `Transform` – world-space position.
- `Sprite` – Pixi container binding.
- `PhysicsBody` – bridge to the kinematic physics world.
- `Hitbox` – debug shape metadata.
- `PlayerControl` – input speed / control flags.

During the fixed-step loop the scene:

1. Reads input into the `PlayerControl` component.
2. Runs the physics world, which updates the `PhysicsBody` component payloads.
3. Syncs `Transform` + Pixi containers from those physics results via a query spanning
   `[Transform, Sprite, PhysicsBody]`.

The HUD’s entity counter now reflects the ECS world (`world.entityCount()`), making it an easy check
for leaks.

## Extending the ECS

This foundation intentionally keeps the surface area minimal. Additions you might consider next:

- Component pools backed by typed arrays for hot data (`Float32Array`, etc.).
- Event emitters for entity/component creation/destruction.
- Query caching if hot loops begin to allocate too much.
- Hierarchical scenes (parent/child) implemented as another component.

Because the API is tiny, migrating to a more featureful ECS later is guarded – systems will only need
adapter functions reimplemented.

Use `docs/ecs.md` as a living document: jot down patterns or decisions as the game grows so future
contributors can ramp up quickly.
