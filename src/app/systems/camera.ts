import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export interface WorldWithCamera {
  viewport: Viewport;
  world: Container;
}

export function createWorldWithCamera(
  app: Application,
  worldWidth = 4000,
  worldHeight = 4000
): WorldWithCamera {
  const viewport = new Viewport({
    screenWidth: app.renderer.width,
    screenHeight: app.renderer.height,
    worldWidth,
    worldHeight,
    events: app.renderer.events
  });

  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate()
    .clamp({ direction: 'all' })
    .clampZoom({ minScale: 0.25, maxScale: 4 });

  app.stage.addChild(viewport);

  const world = new Container();
  world.sortableChildren = true;
  viewport.addChild(world);

  app.renderer.on('resize', () => {
    viewport.resize(app.renderer.width, app.renderer.height, worldWidth, worldHeight);
  });

  return { viewport, world };
}
