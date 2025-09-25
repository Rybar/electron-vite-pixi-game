import { createPixiApp } from './pixiApp';
import { DemoScene } from './app/scenes/DemoScene';

async function bootstrap() {
  const app = await createPixiApp();
  const scene = new DemoScene();
  await scene.init(app);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      scene.destroy();
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap Pixi application', error);
});
