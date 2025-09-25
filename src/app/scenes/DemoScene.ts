import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  TilingSprite
} from 'pixi.js';
import { Viewport } from 'pixi-viewport';

import { attachKeyboard, createInputState } from '../input/input';
import { createHUD } from '../ui/hud';
import { pulse } from '../systems/anim';
import { initAudio, playClick, setMasterVolume, toggleMusic } from '../systems/audio';
import { createWorldWithCamera, type WorldWithCamera } from '../systems/camera';
import { createTextExamples } from '../systems/text';

import { createPlayer } from '../entities/Player';
import { createTargetDummies } from '../entities/TargetDummy';

export class DemoScene {
  private app!: Application;
  private worldWithCamera!: WorldWithCamera;
  private player!: ReturnType<typeof createPlayer>['sprite'];
  private playerPosition = { x: 0, y: 0 };
  private detachKeyboard?: () => void;
  private hudContainer?: Container;
  private tickerFn?: (delta: number) => void;

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

    const hudElements = createHUD(app, () => {
      toggleMusic();
      playClick();
      pulse(hudElements.audioBtn.view);
    });
    this.hudContainer = hudElements.hud;

    hudElements.volume.onUpdate.connect(setMasterVolume);
    hudElements.volume.onChange.connect(setMasterVolume);
    setMasterVolume(hudElements.volume.value ?? 0.5);

    const { styled, bitmap } = await createTextExamples();
    styled.position.set(180, 24);
    hudElements.hud.addChild(styled);
    if (bitmap) {
      bitmap.position.set(180, 52);
      hudElements.hud.addChild(bitmap);
    }

    const debugText = new Text({
      text: '',
      style: new TextStyle({
        fill: 0x8be9fd,
        fontFamily: 'Inter, monospace',
        fontSize: 12
      })
    });
    debugText.position.set(20, 142);
    hudElements.hud.addChild(debugText);
    debugText.text = `Camera: (${viewport.center.x.toFixed(1)}, ${viewport.center.y.toFixed(1)})\nPlayer: (${this.playerPosition.x.toFixed(1)}, ${this.playerPosition.y.toFixed(1)})`;

    await initAudio();
    toggleMusic();

    viewport.follow(this.player, { speed: 10 });
    viewport.moveCenter(this.playerPosition.x, this.playerPosition.y);

    this.tickerFn = ({ deltaTime }) => {
      const speed = 6 * deltaTime;
      const keyboardX = (input.keyboard.right ? 1 : 0) - (input.keyboard.left ? 1 : 0);
      const keyboardY = (input.keyboard.down ? 1 : 0) - (input.keyboard.up ? 1 : 0);

      this.playerPosition.x += keyboardX * speed;
      this.playerPosition.y += keyboardY * speed;

      this.player.position.set(this.playerPosition.x, this.playerPosition.y);

      const cameraCenter = viewport.center;
      debugText.text = `Camera: (${cameraCenter.x.toFixed(1)}, ${cameraCenter.y.toFixed(1)})\nPlayer: (${this.playerPosition.x.toFixed(1)}, ${this.playerPosition.y.toFixed(1)})`;
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

    if (this.hudContainer?.parent) {
      this.hudContainer.parent.removeChild(this.hudContainer);
      this.hudContainer.destroy({ children: true });
      this.hudContainer = undefined;
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
