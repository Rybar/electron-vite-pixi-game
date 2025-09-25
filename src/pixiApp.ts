import 'pixi.js/unsafe-eval';
import { Application } from 'pixi.js';

export type PixiAppOptions = Partial<Parameters<Application['init']>[0]>;

export async function createPixiApp(opts: PixiAppOptions = {}) {
  const app = new Application();

  await app.init({
    background: '#101014',
    antialias: true,
    width: 1280,
    height: 720,
    resolution: 1,
    autoDensity: false,
    ...opts
  });

  const container = document.getElementById('app') ?? document.body;

  if (!container) {
    throw new Error('Unable to locate DOM container to mount Pixi Application');
  }

  const view = app.canvas ?? (app.renderer.view as HTMLCanvasElement | undefined);

  if (!view) {
    throw new Error('Pixi Application has no canvas view to attach');
  }

  if (!view.isConnected) {
    container.appendChild(view);
  }

  return app;
}
