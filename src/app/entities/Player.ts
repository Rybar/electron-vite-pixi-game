import { Container, Graphics } from 'pixi.js';

export interface PlayerInstance {
  sprite: Container;
  position: { x: number; y: number };
}

const SPAWN_POSITION = { x: 2000, y: 2000 };
const BODY_SIZE = 48;
const OUTLINE_SIZE = BODY_SIZE + 6;

export function createPlayer(): PlayerInstance {
  const container = new Container();
  container.position.set(SPAWN_POSITION.x, SPAWN_POSITION.y);
  container.zIndex = 10;
  container.sortableChildren = true;

  const body = new Graphics()
    .rect(-BODY_SIZE / 2, -BODY_SIZE / 2, BODY_SIZE, BODY_SIZE)
    .fill(0xff7043);

  const outline = new Graphics()
    .rect(-OUTLINE_SIZE / 2, -OUTLINE_SIZE / 2, OUTLINE_SIZE, OUTLINE_SIZE)
    .stroke({ width: 4, color: 0x0d0f16 });

  container.addChild(outline, body);

  return {
    sprite: container,
    position: { ...SPAWN_POSITION }
  };
}
