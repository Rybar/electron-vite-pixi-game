import './style.css';
import { Application, Graphics } from 'pixi.js';

async function main() {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root element with id="app" was not found');
  }

  const app = new Application();
  await app.init({
    width: 960,
    height: 540,
    background: '#1e1e2f',
    resolution: window.devicePixelRatio || 1,
    antialias: true
  });

  root.innerHTML = '';
  root.appendChild(app.canvas);

  const square = new Graphics()
    .rect(0, 0, 160, 160)
    .fill(0xff7043);

  square.position.set(
    app.screen.width / 2 - square.width / 2,
    app.screen.height / 2 - square.height / 2
  );
  app.stage.addChild(square);

  app.ticker.add(({ deltaTime }) => {
    square.rotation += 0.01 * deltaTime;
  });

  const versions = window?.electronAPI?.versions;
  if (versions) {
    const versionParts = [];
    if (versions.electron) versionParts.push(`Electron ${versions.electron}`);
    if (versions.chrome) versionParts.push(`Chrome ${versions.chrome}`);
    if (versions.node) versionParts.push(`Node ${versions.node}`);

    if (versionParts.length > 0) {
      const info = document.createElement('div');
      info.className = 'info-bar';
      info.textContent = versionParts.join(' • ');
      root.appendChild(info);
    }
  }
}

main().catch((error) => {
  console.error('Failed to start Pixi application', error);
});
