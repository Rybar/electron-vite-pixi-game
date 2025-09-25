import { Application, Graphics, TilingSprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

import { attachKeyboard, createInputState } from '../input/input';
import { initAudio, setMasterVolume, toggleMusic, isMusicPlaying } from '../systems/audio';
import { createWorldWithCamera, type WorldWithCamera } from '../systems/camera';

import { createPlayer } from '../entities/Player';
import { createTargetDummies } from '../entities/TargetDummy';
import type { HudStore } from '../../hud/hudStore';

export class DemoScene {
  private app!: Application;
  private worldWithCamera!: WorldWithCamera;
  private player!: ReturnType<typeof createPlayer>['sprite'];
  private playerPosition = { x: 0, y: 0 };
  private detachKeyboard?: () => void;
  private tickerFn?: (delta: number) => void;
  private hudUpdateAccumulator = 0;

  constructor(private readonly hudStore: HudStore) {}

  async init(app: Application) {
    this.app = app;

    const worldWidth = 4000;
    const worldHeight = 4000;
    this.worldWithCamera = createWorldWithCamera(app, worldWidth, worldHeight);
    const { viewport, world } = this.worldWithCamera;

    const checkerboard = this.createCheckerboard(app, worldWidth, worldHeight);
    world.addChild(checkerboard);

    const { sprite, position } = createPlayer();
    this.player = sprite;
    this.playerPosition = { ...position };
    this.player.position.set(this.playerPosition.x, this.playerPosition.y);
    world.addChild(this.player);

    createTargetDummies().forEach(({ container }) => {
      world.addChild(container);
    });

    const input = createInputState();
    this.detachKeyboard = attachKeyboard(input);

    await initAudio();
    toggleMusic();
    setMasterVolume(0.5);
    this.hudStore.setState({
      volume: 0.5,
      musicPlaying: isMusicPlaying()
    });

    viewport.follow(this.player, { speed: 10 });
    viewport.moveCenter(this.playerPosition.x, this.playerPosition.y);
    this.hudStore.updateDebug({
      cameraX: viewport.center.x,
      cameraY: viewport.center.y,
      playerX: this.playerPosition.x,
      playerY: this.playerPosition.y,
      fps: this.app.ticker.FPS ?? 0
    });

    this.tickerFn = ({ deltaTime }) => {
      const speed = 6 * deltaTime;
      const keyboardX = (input.keyboard.right ? 1 : 0) - (input.keyboard.left ? 1 : 0);
      const keyboardY = (input.keyboard.down ? 1 : 0) - (input.keyboard.up ? 1 : 0);

      this.playerPosition.x += keyboardX * speed;
      this.playerPosition.y += keyboardY * speed;

      this.player.position.set(this.playerPosition.x, this.playerPosition.y);

      this.hudUpdateAccumulator += this.app.ticker.deltaMS;
      if (this.hudUpdateAccumulator >= 200) {
        const cameraCenter = viewport.center;
        const fps = this.app.ticker.FPS ?? 0;
        this.hudStore.updateDebug({
          cameraX: cameraCenter.x,
          cameraY: cameraCenter.y,
          playerX: this.playerPosition.x,
          playerY: this.playerPosition.y,
          fps
        });
        this.hudUpdateAccumulator = 0;
      }
    };

    app.ticker.add(this.tickerFn);

  }

  destroy() {
    if (this.tickerFn) {
      this.app?.ticker.remove(this.tickerFn);
      this.tickerFn = undefined;
    }

    if (this.detachKeyboard) {
      this.detachKeyboard();
      this.detachKeyboard = undefined;
    }

    this.worldWithCamera?.viewport.destroy({ children: true, texture: true });
  }

  private createCheckerboard(app: Application, width: number, height: number) {
    const tileSize = 128;
    const graphics = new Graphics();

    graphics.rect(0, 0, tileSize, tileSize).fill(0x1c1f2a);
    graphics
      .rect(0, 0, tileSize / 2, tileSize / 2)
      .fill(0x13161f);
    graphics
      .rect(tileSize / 2, tileSize / 2, tileSize / 2, tileSize / 2)
      .fill(0x13161f);

    const texture = app.renderer.generateTexture(graphics);
    graphics.destroy();

    const tiling = new TilingSprite({ texture, width, height });
    tiling.zIndex = -100;

    return tiling;
  }
}
