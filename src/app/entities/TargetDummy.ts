import { Container, Graphics } from 'pixi.js';

export interface TargetDummyInstance {
  container: Container;
  hitbox: { radius: number };
}

const SPAWN_POINTS = [
  { x: 2200, y: 2000 },
  { x: 2000, y: 2200 },
  { x: 1800, y: 2000 },
  { x: 2000, y: 1800 }
];

export function createTargetDummies(): TargetDummyInstance[] {
  return SPAWN_POINTS.map(({ x, y }) => {
    const container = new Container();
    container.position.set(x, y);
    container.zIndex = 5;

    const body = new Graphics()
      .circle(0, 0, 24)
      .fill(0x6c5ce7);

    const outline = new Graphics()
      .circle(0, 0, 28)
      .stroke({ width: 4, color: 0x130f40 });

    container.addChild(outline, body);

    return {
      container,
      hitbox: { radius: 28 }
    };
  });
}
