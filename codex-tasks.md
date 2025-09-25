Here’s a **Codex-ready task list** you can drop into your repo as `tasks/pixi-starter-pack.md` (or paste into a Codex “Run Task”). It assumes **Vite + PixiJS** (TypeScript), and adds the modular stack we discussed: `@pixi/ui`, `pixi-viewport`, `@pixi/sound`, styled text, `BitmapText`, GSAP PixiPlugin, pointer + gamepad input wiring, and a minimal HUD. Adjust package manager commands if you use `pnpm`/`yarn`.

---

# Codex Task Suite — Pixi Starter Pack Integration

> Goal: add a small, opinionated set of libraries to an existing **Vite + PixiJS** app and wire up a playable demo scene with camera, UI, audio toggle, gamepad & pointer input, styled text, bitmap font, and GSAP-based tweening.
> Constraints: keep changes modular; don’t introduce a heavyweight game framework.
> Output: a runnable demo scene with a moving sprite on a scrollable/zoomable world and a basic HUD.

## 0) Project assumptions

* Repo already contains a working **Vite + PixiJS** app entry (e.g., `src/main.ts` that boots a Pixi `Application`).
* TypeScript enabled (if not, enable TS minimal config).
* Electron packaging exists but **do not** change electron config in this task; only touch the web layer.

---

## 1) Add dependencies

**Install** (pick one command style and use consistently):

```bash
# npm
npm i @pixi/ui pixi-viewport @pixi/sound gsap @pixi/text-html

# types
npm i -D @types/webappsec-credential-management # sometimes needed for TS DOM lib drift, safe to add
```

> Notes:
>
> * `@pixi/text-html` gives multi-style text; if it conflicts in your setup, fall back to `pixi-multistyle-text`.
> * We will generate a **bitmap font** at build time later (optional); for now we’ll include a placeholder `.fnt`.

**Acceptance criteria**

* `package.json` updated.
* Lockfile updated.
* Project compiles.

---

## 2) Source structure and scaffolding

Create folders if missing:

```
src/
  app/
    assets/        # images, audio, fonts
    scenes/        # scene classes
    ui/            # ui components
    input/         # input bindings
    systems/       # animation, camera, audio controllers
  main.ts
  pixiApp.ts       # central app factory
  types.d.ts
```

**Acceptance criteria**

* Folders exist.
* No unused/empty imports left behind.

---

## 3) Central Pixi Application factory

Create `src/pixiApp.ts`:

```ts
// src/pixiApp.ts
import { Application } from 'pixi.js';

export async function createPixiApp(opts?: Partial<ConstructorParameters<typeof Application>[0]>) {
  const app = new Application({
    background: '#101014',
    antialias: true,
    resizeTo: window,
    ...opts,
  });
  // Attach to DOM
  const container = document.getElementById('app') ?? document.body;
  container.appendChild(app.view as HTMLCanvasElement);
  return app;
}
```

**Acceptance criteria**

* App factory compiles and returns an attached `Application`.

---

## 4) Camera & world: pixi-viewport

Create `src/systems/camera.ts`:

```ts
// src/systems/camera.ts
import { Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export function createWorldWithCamera(app: import('pixi.js').Application, worldWidth = 4000, worldHeight = 4000) {
  const viewport = new Viewport({
    screenWidth: app.renderer.width,
    screenHeight: app.renderer.height,
    worldWidth,
    worldHeight,
    events: app.renderer.events, // Pixi Federated Events
  });

  // common interactions
  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate()
    .clamp({ direction: 'all' })
    .clampZoom({ minScale: 0.25, maxScale: 4 });

  app.stage.addChild(viewport);

  // World container (optional layer)
  const world = new Container();
  viewport.addChild(world);

  // keep viewport sized
  app.renderer.on('resize', () => {
    viewport.resize(app.renderer.width, app.renderer.height, worldWidth, worldHeight);
  });

  return { viewport, world };
}
```

**Acceptance criteria**

* Panning with mouse/touch works.
* Wheel and pinch zoom work.
* Camera clamped; resizes correctly.

---

## 5) UI: @pixi/ui HUD with a button & slider

Create `src/ui/hud.ts`:

```ts
// src/ui/hud.ts
import { Container, NineSliceSprite, Texture } from 'pixi.js';
import { Button, Slider, UIBuilder } from '@pixi/ui';

export function createHUD(app: import('pixi.js').Application, onToggleAudio: () => void) {
  const hud = new Container();
  hud.eventMode = 'static';
  hud.sortableChildren = true;

  // Panel (nine-slice). Replace with your own texture.
  const panel = new NineSliceSprite(Texture.WHITE, 8, 8, 8, 8);
  panel.tint = 0x0a0a12;
  panel.alpha = 0.8;
  panel.width = 320;
  panel.height = 120;
  hud.addChild(panel);
  panel.zIndex = 0;

  // Build UI elements
  const builder = new UIBuilder();

  const audioBtn = new Button(Texture.WHITE);
  audioBtn.view.width = 120;
  audioBtn.view.height = 32;
  audioBtn.view.tint = 0x2222aa;
  audioBtn.onPress.connect(onToggleAudio);

  const volume = new Slider({
    bg: Texture.WHITE,
    fill: Texture.WHITE,
    handle: Texture.WHITE,
  });
  volume.view.width = 180;
  volume.view.height = 8;
  volume.view.y = 50;

  hud.addChild(audioBtn.view, volume.view);

  // Position top-left with padding
  hud.x = 16;
  hud.y = 16;

  // Keep HUD fixed (don’t add to viewport)
  app.stage.addChild(hud);

  return { hud, audioBtn, volume };
}
```

**Acceptance criteria**

* A translucent panel appears top-left with a clickable button and slider.
* Button calls `onToggleAudio`.
* Slider emits value changes (we’ll wire to volume in audio step).

---

## 6) Audio: @pixi/sound and a toggle

Create `src/systems/audio.ts`:

```ts
// src/systems/audio.ts
import { sound } from '@pixi/sound';

export async function initAudio() {
  // load a short click or music loop; replace paths as needed
  await sound.add('click', 'assets/audio/click.mp3');
  await sound.add('bg', { url: 'assets/audio/loop.mp3', loop: true, volume: 0.5 });
}

export function toggleMusic() {
  const inst = sound.find('bg');
  if (!inst) return;
  if (inst.isPlaying) inst.pause();
  else inst.play();
}

export function setMasterVolume(v: number) {
  sound.volumeAll = Math.max(0, Math.min(1, v));
}

export function playClick() {
  sound.play('click');
}
```

**Acceptance criteria**

* Assets load without runtime errors.
* Toggling music works; slider changes master volume.

---

## 7) Input: pointer & gamepad bindings

Create `src/input/input.ts`:

```ts
// src/input/input.ts
export type InputState = {
  mouseWorldX: number;
  mouseWorldY: number;
  mouseDown: boolean;
  gamepad: {
    connected: boolean;
    axes: number[]; // [lx, ly, rx, ry]
    buttons: boolean[];
  };
};

export function createInputState(): InputState {
  return {
    mouseWorldX: 0,
    mouseWorldY: 0,
    mouseDown: false,
    gamepad: { connected: false, axes: [0,0,0,0], buttons: [] }
  };
}

export function attachPointer(app: import('pixi.js').Application, viewport: any, state: InputState) {
  // Convert screen -> world via viewport
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  app.stage.on('pointermove', (e: any) => {
    const pos = viewport.toWorld(e.global);
    state.mouseWorldX = pos.x;
    state.mouseWorldY = pos.y;
  });
  app.stage.on('pointerdown', () => (state.mouseDown = true));
  app.stage.on('pointerup', () => (state.mouseDown = false));
}

export function attachGamepad(state: InputState) {
  window.addEventListener('gamepadconnected', () => { state.gamepad.connected = true; });
  window.addEventListener('gamepaddisconnected', () => { state.gamepad.connected = false; });

  // Call each frame to refresh
  return function pollGamepad() {
    const gp = navigator.getGamepads?.()[0];
    if (!gp) return;
    state.gamepad.axes = gp.axes.slice(0,4).map(a => Math.abs(a) > 0.1 ? a : 0);
    state.gamepad.buttons = gp.buttons.map(b => !!b.pressed);
  };
}
```

**Acceptance criteria**

* Pointer updates world coordinates.
* Gamepad connects and provides axes/buttons.

---

## 8) Text: styled & bitmap

Add a placeholder bitmap font to `src/app/assets/fonts/` (e.g., `arcade.fnt` + `arcade.png`). If none available, skip loading for now.

Create `src/systems/text.ts`:

```ts
// src/systems/text.ts
import { BitmapText, Assets } from 'pixi.js';
import { HtmlText } from '@pixi/text-html';

export async function createTextExamples() {
  // Styled text (HTML-like)
  const styled = new HtmlText('<b>Pixi</b> <i>Starter</i> <span style="color:#77dd77">Pack</span>', {
    fontFamily: 'sans-serif',
    fontSize: 18,
    fill: 0xffffff
  });

  // Bitmap text
  // await Assets.load(['assets/fonts/arcade.fnt']); // enable when font provided
  const bmp = new BitmapText('SCORE 0000', {
    fontName: 'arcade', // name inside .fnt
    fontSize: 24
  });

  bmp.y = 28;
  return { styled, bmp };
}
```

**Acceptance criteria**

* Styled text renders.
* Bitmap text renders when `.fnt` present (otherwise safely skipped).

---

## 9) Animation: GSAP PixiPlugin

Create `src/systems/anim.ts`:

```ts
// src/systems/anim.ts
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import type { DisplayObject } from 'pixi.js';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(await import('pixi.js'));

export function pulse(obj: DisplayObject) {
  gsap.to(obj, { pixi: { scale: 1.2 }, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' });
}
```

**Acceptance criteria**

* Calling `pulse(sprite)` briefly scales it up/down.

---

## 10) Demo scene that ties it all together

Create `src/app/scenes/DemoScene.ts`:

```ts
// src/app/scenes/DemoScene.ts
import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { createWorldWithCamera } from '../../systems/camera';
import { createHUD } from '../../ui/hud';
import { initAudio, toggleMusic, setMasterVolume, playClick } from '../../systems/audio';
import { createInputState, attachPointer, attachGamepad } from '../../input/input';
import { createTextExamples } from '../../systems/text';
import { pulse } from '../../systems/anim';

export class DemoScene {
  private app!: Application;
  private viewport!: any;
  private player!: Sprite;
  private pollGamepad!: () => void;

  async init(app: Application) {
    this.app = app;

    const { viewport, world } = createWorldWithCamera(app, 4000, 4000);
    this.viewport = viewport;

    // Load assets (replace with real textures)
    await Assets.load([
      { alias: 'player', src: 'assets/img/player.png' }
    ]);

    // Player
    this.player = new Sprite(Texture.from('player'));
    this.player.anchor.set(0.5);
    this.player.position.set(2000, 2000);
    world.addChild(this.player);

    // Input
    const input = createInputState();
    attachPointer(app, viewport, input);
    this.pollGamepad = attachGamepad(input);

    // UI
    const { hud, audioBtn, volume } = createHUD(app, () => {
      toggleMusic();
      playClick();
      pulse(audioBtn.view);
    });
    volume.onChange.connect((v: number) => setMasterVolume(v));

    // Text
    const { styled, bmp } = await createTextExamples();
    hud.addChild(styled);
    styled.x = 8; styled.y = 84;
    hud.addChild(bmp);

    // Audio
    await initAudio();

    // Follow player
    viewport.follow(this.player, { speed: 10 });

    // Game loop
    app.ticker.add((dt) => {
      this.pollGamepad?.();

      // basic movement: mouse attracts
      const dx = input.mouseWorldX - this.player.x;
      const dy = input.mouseWorldY - this.player.y;
      const s = 0.02 * dt;
      this.player.x += dx * s;
      this.player.y += dy * s;

      // gamepad left stick nudges position
      // (axes in [-1..1])
      // @ts-ignore
      const [lx, ly] = (window as any).lastAxes ?? [0,0];

      // we stored in input state instead:
      const axes = (input.gamepad.axes);
      if (axes && axes.length >= 2) {
        this.player.x += axes[0] * 5 * dt;
        this.player.y += axes[1] * 5 * dt;
      }
    });
  }

  destroy() {
    this.app.ticker.stop();
    this.app.stage.removeChildren();
  }
}
```

**Acceptance criteria**

* Player sprite exists and moves toward mouse position.
* Camera follows player; pan/zoom works.
* HUD shows, audio toggle works, volume slider adjusts volume, button pulses.
* Gamepad stick nudges player.

---

## 11) Bootstrap in `main.ts`

Edit `src/main.ts`:

```ts
// src/main.ts
import { createPixiApp } from './pixiApp';
import { DemoScene } from './app/scenes/DemoScene';

(async () => {
  const app = await createPixiApp();
  const scene = new DemoScene();
  await scene.init(app);
})();
```

**Acceptance criteria**

* App launches with DemoScene and no console errors (given placeholder assets exist).

---

## 12) Assets & Vite static handling

* Place placeholder files:

  * `src/app/assets/img/player.png` (any small image)
  * `src/app/assets/audio/click.mp3`, `src/app/assets/audio/loop.mp3`
  * (optional) `src/app/assets/fonts/arcade.fnt` + `arcade.png`

**Vite config check**: ensure assets under `src/` get resolved. If you prefer `public/` assets, move `assets/` under `public/` and update paths accordingly (`/assets/...`).

**Acceptance criteria**

* Assets load in dev build.
* Production build (`vite build`) copies assets and resolves URLs.

---

## 13) Types & TS config

* Ensure `tsconfig.json` includes `"dom"` in `lib` and has `"strict": true` (recommended).
* Add `src/types.d.ts` if needed for image/audio modules:

```ts
// src/types.d.ts
declare module '*.png' { const url: string; export default url; }
declare module '*.jpg' { const url: string; export default url; }
declare module '*.mp3' { const url: string; export default url; }
declare module '*.fnt' { const url: string; export default url; }
```

**Acceptance criteria**

* TypeScript compiles without ad-hoc `any` workarounds for asset imports.

---

## 14) NPM scripts

Add/confirm scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

> If Electron is used during dev, keep existing electron scripts unchanged.

**Acceptance criteria**

* `npm run dev` starts in-browser (or electron if that’s your current workflow).
* `npm run build` completes without errors.

---

## 15) Milestones:

Milestones:

1. `feat(pixi): add ui, viewport, sound, text-html, gsap deps`
2. `feat(pixi): camera system and world container`
3. `feat(ui): HUD with toggle and volume slider`
4. `feat(audio): sound init, toggle, and master volume`
5. `feat(input): pointer and gamepad bindings`
6. `feat(text): styled text + bitmap text scaffold`
7. `feat(anim): gsap PixiPlugin helper`
8. `feat(scene): demo scene wiring`
9. `chore(assets): placeholder images/audio/fonts`
10. `docs: add tasks/pixi-starter-pack.md`

---

## 16) Optional follow-ups (separate tasks)

* **Physics (optional):** add `matter-js` or `planck.js` headless; sync positions to sprites; simple collisions demo.
* **Layout (optional):** integrate **PixiJS Layout (Yoga)** for HUD/menu screens with flexbox-style rows/columns.
* **DOM overlay forms:** for settings/long forms, add a DOM overlay div (positioned absolute) and show/hide on pause.
* **@pixi/react:** if using React for tooling, add a `canvas` host + React portal for dev UI panels separate from HUD.

---

## Done criteria (definition of done)

* Running the dev build shows:

  * A camera-zoomable world (pan/wheel/pinch) with a sprite that follows the mouse.
  * A HUD in the top-left with a working **Audio** toggle and **Volume** slider.
  * Styled text label and (if font provided) a bitmap “SCORE” counter.
  * Gamepad support (left stick moves sprite slowly).
  * A simple GSAP pulse tween on button press.
* Build succeeds and assets are correctly bundled for production.

---

> **Notes to Codex**
>
> * Keep changes additive and avoid breaking existing entrypoints.
> * If an import path fails for assets, prefer switching to Vite `/public` folder with absolute `/assets/...` paths and update references.
> * Keep functions small and testable; avoid single mega-files.
