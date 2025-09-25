import { Application, Container, Graphics, TilingSprite, Texture } from 'pixi.js';

import { createAssetLoader, type AssetLoader } from '../core/assets';
import { startFixedStep, type FixedStepController } from '../core/fixedStep';
import { EntityRegistry, type EntityRecord } from '../core/entityRegistry';
import {
  attachGamepad,
  attachPointer,
  createGamepadState,
  createInputMapper,
  createPointerState,
  digitalAxis,
  type GamepadPoller,
  type InputMapper,
  type KeyboardBinding
} from '../input/input';
import { createPlayer } from '../entities/Player';
import { createTargetDummies } from '../entities/TargetDummy';
import { initAudio, isMusicPlaying, setMasterVolume, toggleMusic } from '../systems/audio';
import { createWorldWithCamera, type WorldWithCamera } from '../systems/camera';
import {
  createPhysicsWorld,
  type DynamicBody,
  type PhysicsWorld,
  type StaticBody
} from '../physics/physics';

import type { HudStore } from '../../hud/hudStore';

const BACKGROUND_TEXTURE_URL = new URL('../assets/img/background.png', import.meta.url).href;

type HitboxShape =
  | { type: 'rect'; width: number; height: number }
  | { type: 'circle'; radius: number };

interface BaseEntityData {
  display: Container;
  hitbox?: HitboxShape;
}

interface PlayerEntityData extends BaseEntityData {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  speed: number;
  body: DynamicBody;
}

interface DummyEntityData extends BaseEntityData {}

type GameAction =
  | 'move.up'
  | 'move.down'
  | 'move.left'
  | 'move.right'
  | 'debug.toggleHitboxes';

const KEYBOARD_BINDINGS: KeyboardBinding<GameAction>[] = [
  { code: 'ArrowUp', action: 'move.up' },
  { code: 'ArrowDown', action: 'move.down' },
  { code: 'ArrowLeft', action: 'move.left' },
  { code: 'ArrowRight', action: 'move.right' },
  { code: 'KeyW', action: 'move.up', preventDefault: false },
  { code: 'KeyS', action: 'move.down', preventDefault: false },
  { code: 'KeyA', action: 'move.left', preventDefault: false },
  { code: 'KeyD', action: 'move.right', preventDefault: false },
  { code: 'F1', action: 'debug.toggleHitboxes' }
];

export class DemoScene {
  private app!: Application;
  private worldWithCamera!: WorldWithCamera;

  private readonly assets: AssetLoader;
  private readonly entities = new EntityRegistry();

  private fixedStep?: FixedStepController;
  private input?: InputMapper<GameAction>;
  private pointerDetach?: () => void;
  private gamepadPoller?: GamepadPoller;
  private hudUnsubscribe?: () => void;

  private readonly pointerState = createPointerState();
  private readonly gamepadState = createGamepadState();
  private readonly hitboxGraphics = new Map<number, Graphics>();
  private readonly staticHitboxGraphics: Graphics[] = [];

  private hitboxOverlay?: Container;
  private hudUpdateAccumulator = 0;
  private playerRecord?: EntityRecord<PlayerEntityData>;
  private physicsWorld?: PhysicsWorld;
  private staticBodies: StaticBody[] = [];

  constructor(private readonly hudStore: HudStore) {
    this.assets = createAssetLoader([
      { id: 'background.tiles', src: BACKGROUND_TEXTURE_URL }
    ]);
  }

  async init(app: Application) {
    this.app = app;

    const worldWidth = 4000;
    const worldHeight = 4000;

    this.worldWithCamera = createWorldWithCamera(app, worldWidth, worldHeight);
    const { viewport, world } = this.worldWithCamera;

    this.physicsWorld = createPhysicsWorld({ cellSize: 256 });

    let backgroundTexture: Texture | undefined;
    try {
      backgroundTexture = await this.assets.load<Texture>('background.tiles');
    } catch (error) {
      console.warn('Unable to load background texture, falling back to procedural checkerboard', error);
    }

    const background = this.createBackground(app, worldWidth, worldHeight, backgroundTexture);
    world.addChild(background);

    this.hitboxOverlay = new Container();
    this.hitboxOverlay.zIndex = 9999;
    this.hitboxOverlay.visible = this.hudStore.getState().debug.showHitboxes;
    world.addChild(this.hitboxOverlay);

    this.staticBodies = this.createLevelGeometry(world, worldWidth, worldHeight);
    this.staticBodies.forEach((body) => this.drawStaticHitbox(body));

    const player = createPlayer();
    player.sprite.position.set(player.position.x, player.position.y);
    world.addChild(player.sprite);

    const playerBody = this.physicsWorld.addDynamicBody({
      x: player.position.x - player.hitbox.width / 2,
      y: player.position.y - player.hitbox.height / 2,
      width: player.hitbox.width,
      height: player.hitbox.height
    });

    this.playerRecord = this.entities.add<PlayerEntityData>('player', {
      display: player.sprite,
      position: { ...player.position },
      velocity: { x: 0, y: 0 },
      speed: 320,
      hitbox: { type: 'rect', width: player.hitbox.width, height: player.hitbox.height },
      body: playerBody
    });
    this.registerHitbox(this.playerRecord);

    createTargetDummies().forEach((dummy) => {
      const record = this.entities.add<DummyEntityData>('dummy', {
        display: dummy.container,
        hitbox: { type: 'circle', radius: dummy.hitbox.radius }
      });
      world.addChild(dummy.container);
      this.registerHitbox(record);
    });

    viewport.follow(player.sprite, { speed: 10 });
    viewport.moveCenter(player.position.x, player.position.y);

    this.input = createInputMapper<GameAction>(KEYBOARD_BINDINGS);
    this.pointerDetach = attachPointer(app, viewport, this.pointerState);
    this.gamepadPoller = attachGamepad(this.gamepadState);

    await initAudio();
    if (!isMusicPlaying()) {
      toggleMusic();
    }
    setMasterVolume(0.5);
    this.hudStore.setState({
      volume: 0.5,
      musicPlaying: isMusicPlaying()
    });

    this.fixedStep = startFixedStep(app.ticker, this.handleSimulationStep, { hz: 60 });
    this.hudUpdateAccumulator = 0;

    this.hudUnsubscribe = this.hudStore.subscribe(this.handleHudStoreChange);
    this.handleHudStoreChange();
    this.updateHud();
  }

  destroy() {
    this.fixedStep?.detach();
    this.fixedStep = undefined;

    this.input?.dispose();
    this.input = undefined;

    this.pointerDetach?.();
    this.pointerDetach = undefined;

    this.gamepadPoller?.dispose();
    this.gamepadPoller = undefined;

    this.hudUnsubscribe?.();
    this.hudUnsubscribe = undefined;

    this.hitboxGraphics.forEach((graphic) => graphic.destroy());
    this.hitboxGraphics.clear();
    this.staticHitboxGraphics.forEach((graphic) => graphic.destroy());
    this.staticHitboxGraphics.length = 0;
    this.hitboxOverlay?.destroy({ children: true });
    this.hitboxOverlay = undefined;

    this.assets.clear();
    this.entities.clear();
    this.physicsWorld?.clear();
    this.physicsWorld = undefined;

    this.worldWithCamera?.viewport.destroy({ children: true, texture: true });
  }

  private createLevelGeometry(world: Container, width: number, height: number): StaticBody[] {
    if (!this.physicsWorld) {
      return [];
    }

    const borderThickness = 64;
    const staticRects = [
      { x: 0, y: 0, width, height: borderThickness },
      { x: 0, y: height - borderThickness, width, height: borderThickness },
      { x: 0, y: 0, width: borderThickness, height },
      { x: width - borderThickness, y: 0, width: borderThickness, height },
      { x: width / 2 - 200, y: height / 2 - 32, width: 400, height: 64 },
      { x: width / 2 - 32, y: height / 2 - 200, width: 64, height: 400 }
    ];

    const bodies = staticRects.map((rect) => {
      const body = this.physicsWorld!.addStaticBody(rect);

      const tile = new Graphics()
        .rect(0, 0, rect.width, rect.height)
        .fill(0x191b22);
      tile.position.set(rect.x, rect.y);
      tile.alpha = 0.65;
      tile.zIndex = -10;
      world.addChild(tile);

      return body;
    });

    return bodies;
  }

  private createBackground(
    app: Application,
    width: number,
    height: number,
    texture?: Texture
  ) {
    if (texture) {
      const tiling = new TilingSprite({ texture, width, height });
      tiling.zIndex = -100;
      return tiling;
    }

    const tileSize = 128;
    const graphics = new Graphics();

    graphics.rect(0, 0, tileSize, tileSize).fill(0x1c1f2a);
    graphics
      .rect(0, 0, tileSize / 2, tileSize / 2)
      .fill(0x13161f);
    graphics
      .rect(tileSize / 2, tileSize / 2, tileSize / 2, tileSize / 2)
      .fill(0x13161f);

    const generated = app.renderer.generateTexture(graphics);
    graphics.destroy();

    const tiling = new TilingSprite({ texture: generated, width, height });
    tiling.zIndex = -100;
    return tiling;
  }

  private registerHitbox(record: EntityRecord<BaseEntityData>) {
    if (!this.hitboxOverlay || !record.data.hitbox) {
      return;
    }

    const graphic = new Graphics();
    graphic.zIndex = 1;

    const hitbox = record.data.hitbox;
    if (hitbox.type === 'rect') {
      graphic
        .rect(-hitbox.width / 2, -hitbox.height / 2, hitbox.width, hitbox.height)
        .stroke({ width: 2, color: 0x00ff88, alpha: 0.9 });
    } else {
      graphic
        .circle(0, 0, hitbox.radius)
        .stroke({ width: 2, color: 0x00ff88, alpha: 0.9 });
    }

    graphic.position.set(record.data.display.position.x, record.data.display.position.y);

    this.hitboxOverlay.addChild(graphic);
    this.hitboxGraphics.set(record.id, graphic);
  }

  private drawStaticHitbox(body: StaticBody) {
    if (!this.hitboxOverlay) {
      return;
    }

    const graphic = new Graphics()
      .rect(-body.width / 2, -body.height / 2, body.width, body.height)
      .stroke({ width: 2, color: 0xffc400, alpha: 0.6 });
    graphic.position.set(body.x + body.width / 2, body.y + body.height / 2);
    this.hitboxOverlay.addChild(graphic);
    this.staticHitboxGraphics.push(graphic);
  }

  private updateHitboxPositions() {
    for (const [id, graphic] of this.hitboxGraphics.entries()) {
      const record = this.entities.get<BaseEntityData>(id);
      if (!record) {
        continue;
      }
      graphic.position.set(record.data.display.position.x, record.data.display.position.y);
    }
  }

  private handleSimulationStep = (dt: number) => {
    this.gamepadPoller?.();

    if (!this.playerRecord || !this.input || !this.physicsWorld) {
      return;
    }

    const snapshot = this.input.poll();
    if (snapshot.pressed.includes('debug.toggleHitboxes')) {
      const current = this.hudStore.getState().debug.showHitboxes;
      this.hudStore.updateDebug({ showHitboxes: !current });
    }

    let axisX = digitalAxis(this.input, 'move.left', 'move.right');
    let axisY = digitalAxis(this.input, 'move.up', 'move.down');

    if (this.gamepadState.connected) {
      const padX = this.gamepadState.axes[0] ?? 0;
      const padY = this.gamepadState.axes[1] ?? 0;
      if (Math.abs(padX) > 0.1) axisX = padX;
      if (Math.abs(padY) > 0.1) axisY = padY;
    }

    let magnitude = Math.hypot(axisX, axisY);
    if (magnitude > 1) {
      axisX /= magnitude;
      axisY /= magnitude;
    }

    const player = this.playerRecord.data;
    const playerBody = player.body;
    playerBody.vx = axisX * player.speed;
    playerBody.vy = axisY * player.speed;

    this.physicsWorld.step(dt);

    player.velocity.x = playerBody.vx;
    player.velocity.y = playerBody.vy;
    player.position.x = playerBody.x + playerBody.width / 2;
    player.position.y = playerBody.y + playerBody.height / 2;
    player.display.position.set(player.position.x, player.position.y);

    this.updateHitboxPositions();

    this.hudUpdateAccumulator += this.app.ticker.deltaMS;
    if (this.hudUpdateAccumulator >= 200) {
      this.updateHud();
      this.hudUpdateAccumulator = 0;
    }
  };

  private updateHud() {
    if (!this.playerRecord || !this.worldWithCamera) {
      return;
    }

    const { viewport } = this.worldWithCamera;
    const player = this.playerRecord.data;
    const stats = this.fixedStep?.getStats();
    const fps = this.app.ticker.FPS ?? 0;

    this.hudStore.updateDebug({
      cameraX: viewport.center.x,
      cameraY: viewport.center.y,
      playerX: player.position.x,
      playerY: player.position.y,
      fps,
      stepMs: stats?.lastStepDurationMs ?? 0,
      entities: this.entities.count(),
      playerGrounded: player.body.onGround
    });
  }

  private handleHudStoreChange = () => {
    if (this.hitboxOverlay) {
      this.hitboxOverlay.visible = this.hudStore.getState().debug.showHitboxes;
    }
  };
}
