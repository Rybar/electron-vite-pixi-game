import type { Application, FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';

export type InputState = {
  mouseWorldX: number;
  mouseWorldY: number;
  mouseDown: boolean;
  gamepad: {
    connected: boolean;
    axes: number[];
    buttons: boolean[];
  };
  keyboard: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
};

export type GamepadPoller = (() => void) & { dispose(): void };

export function createInputState(): InputState {
  return {
    mouseWorldX: 0,
    mouseWorldY: 0,
    mouseDown: false,
    gamepad: {
      connected: false,
      axes: [0, 0, 0, 0],
      buttons: []
    },
    keyboard: {
      up: false,
      down: false,
      left: false,
      right: false
    }
  };
}

export function attachPointer(
  app: Application,
  viewport: Viewport,
  state: InputState
): () => void {
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  const updatePointer = (event: FederatedPointerEvent) => {
    const pos = viewport.toWorld(event.global);
    state.mouseWorldX = pos.x;
    state.mouseWorldY = pos.y;
  };

  const handleDown = () => {
    state.mouseDown = true;
  };

  const handleUp = () => {
    state.mouseDown = false;
  };

  app.stage.on('pointermove', updatePointer);
  app.stage.on('pointerdown', handleDown);
  app.stage.on('pointerup', handleUp);
  app.stage.on('pointerupoutside', handleUp);

  return () => {
    app.stage.off('pointermove', updatePointer);
    app.stage.off('pointerdown', handleDown);
    app.stage.off('pointerup', handleUp);
    app.stage.off('pointerupoutside', handleUp);
  };
}

export function attachGamepad(state: InputState): GamepadPoller {
  const handleConnect = () => {
    state.gamepad.connected = true;
  };

  const handleDisconnect = () => {
    state.gamepad.connected = false;
    state.gamepad.axes = [0, 0, 0, 0];
    state.gamepad.buttons = [];
  };

  window.addEventListener('gamepadconnected', handleConnect);
  window.addEventListener('gamepaddisconnected', handleDisconnect);

  const poll: GamepadPoller = (() => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads?.[0];
    if (!pad) {
      if (state.gamepad.connected) {
        handleDisconnect();
      }
      return;
    }

    state.gamepad.connected = true;
    state.gamepad.axes = pad.axes.slice(0, 4).map((value) => (Math.abs(value) > 0.1 ? value : 0));
    state.gamepad.buttons = pad.buttons.map((btn) => btn.pressed);
  }) as GamepadPoller;

  poll.dispose = () => {
    window.removeEventListener('gamepadconnected', handleConnect);
    window.removeEventListener('gamepaddisconnected', handleDisconnect);
  };

  return poll;
}

export function attachKeyboard(state: InputState): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        state.keyboard.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        state.keyboard.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        state.keyboard.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        state.keyboard.right = true;
        break;
      default:
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        state.keyboard.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        state.keyboard.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        state.keyboard.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        state.keyboard.right = false;
        break;
      default:
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
