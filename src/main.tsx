import { createRoot } from 'react-dom/client';

import { createPixiApp } from './pixiApp';
import { DemoScene } from './app/scenes/DemoScene';
import { HudApp } from './hud/HudApp';
import { createHudStore } from './hud/hudStore';

async function bootstrap() {
  const container = document.getElementById('app');

  if (!container) {
    throw new Error('Unable to locate application container element');
  }

  const hudHostId = 'hud-root';
  let hudHost = document.getElementById(hudHostId);

  if (!hudHost) {
    hudHost = document.createElement('div');
    hudHost.id = hudHostId;
    container.appendChild(hudHost);
  }

  const hudStore = createHudStore();
  const hudRoot = createRoot(hudHost);

  const app = await createPixiApp();
  const scene = new DemoScene(hudStore);
  await scene.init(app);

  hudRoot.render(<HudApp store={hudStore} />);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      scene.destroy();
      hudRoot.unmount();
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap Pixi application', error);
});
