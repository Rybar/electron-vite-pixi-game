import type { Application, FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';

export type InputAction = string;

export interface KeyboardBinding<Action extends string = InputAction> {
  action: Action;
  code: string;
  preventDefault?: boolean;
}

interface BindingSpec<Action extends string = InputAction> {
  action: Action;
  preventDefault: boolean;
}

export interface InputSnapshot<Action extends string = InputAction> {
  held: Action[];
  pressed: Action[];
  released: Action[];
}

export interface InputMapper<Action extends string = InputAction> {
  poll(): InputSnapshot<Action>;
  isHeld(action: Action): boolean;
  dispose(): void;
}

export function createInputMapper<Action extends string = InputAction>(
  bindings: readonly KeyboardBinding<Action>[],
  target: Window = window
): InputMapper<Action> {
  const keyboardBindings = new Map<string, BindingSpec<Action>[]>();
  bindings.forEach((binding) => {
    const normalized: BindingSpec<Action> = {
      action: binding.action,
      preventDefault: binding.preventDefault ?? true
    };
    const list = keyboardBindings.get(binding.code);
    if (list) {
      list.push(normalized);
    } else {
      keyboardBindings.set(binding.code, [normalized]);
    }
  });

  const held = new Set<Action>();
  const pressed = new Set<Action>();
  const released = new Set<Action>();

  const handleKeyDown = (event: KeyboardEvent) => {
    const specs = keyboardBindings.get(event.code);
    if (!specs) {
      return;
    }

    let prevent = false;
    for (const spec of specs) {
      if (!held.has(spec.action)) {
        held.add(spec.action);
        pressed.add(spec.action);
      }
      prevent ||= spec.preventDefault;
    }

    if (prevent) {
      event.preventDefault();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const specs = keyboardBindings.get(event.code);
    if (!specs) {
      return;
    }

    let prevent = false;
    for (const spec of specs) {
      if (held.has(spec.action)) {
        held.delete(spec.action);
        released.add(spec.action);
      }
      prevent ||= spec.preventDefault;
    }

    if (prevent) {
      event.preventDefault();
    }
  };

  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('keyup', handleKeyUp);

  return {
    poll() {
      const snapshot: InputSnapshot<Action> = {
        held: Array.from(held),
        pressed: Array.from(pressed),
        released: Array.from(released)
      };
      pressed.clear();
      released.clear();
      return snapshot;
    },
    isHeld(action: Action) {
      return held.has(action);
    },
    dispose() {
      target.removeEventListener('keydown', handleKeyDown);
      target.removeEventListener('keyup', handleKeyUp);
      held.clear();
      pressed.clear();
      released.clear();
    }
  };
}

export function digitalAxis<Action extends string = InputAction>(
  input: Pick<InputMapper<Action>, 'isHeld'>,
  negative: Action,
  positive: Action
) {
  const neg = input.isHeld(negative) ? -1 : 0;
  const pos = input.isHeld(positive) ? 1 : 0;
  return neg + pos;
}

export interface PointerState {
  mouseWorldX: number;
  mouseWorldY: number;
  mouseDown: boolean;
}

export function createPointerState(): PointerState {
  return {
    mouseWorldX: 0,
    mouseWorldY: 0,
    mouseDown: false
  };
}

export type GamepadState = {
  connected: boolean;
  axes: number[];
  buttons: boolean[];
};

export type GamepadPoller = (() => void) & { dispose(): void };

export function attachPointer(
  app: Application,
  viewport: Viewport,
  state: PointerState
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

export function createGamepadState(): GamepadState {
  return {
    connected: false,
    axes: [0, 0, 0, 0],
    buttons: []
  };
}

export function attachGamepad(state: GamepadState): GamepadPoller {
  const handleConnect = () => {
    state.connected = true;
  };

  const handleDisconnect = () => {
    state.connected = false;
    state.axes = [0, 0, 0, 0];
    state.buttons = [];
  };

  window.addEventListener('gamepadconnected', handleConnect);
  window.addEventListener('gamepaddisconnected', handleDisconnect);

  const poll: GamepadPoller = (() => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads?.[0];
    if (!pad) {
      if (state.connected) {
        handleDisconnect();
      }
      return;
    }

    state.connected = true;
    state.axes = pad.axes.slice(0, 4).map((value) => (Math.abs(value) > 0.1 ? value : 0));
    state.buttons = pad.buttons.map((btn) => btn.pressed);
  }) as GamepadPoller;

  poll.dispose = () => {
    window.removeEventListener('gamepadconnected', handleConnect);
    window.removeEventListener('gamepaddisconnected', handleDisconnect);
  };

  return poll;
}
