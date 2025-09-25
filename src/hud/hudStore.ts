export interface HudDebugInfo {
  cameraX: number;
  cameraY: number;
  playerX: number;
  playerY: number;
  fps: number;
  stepMs: number;
  entities: number;
  showHitboxes: boolean;
}

export interface HudState {
  debug: HudDebugInfo;
  volume: number;
  musicPlaying: boolean;
}

export type HudStore = {
  getState(): HudState;
  subscribe(listener: () => void): () => void;
  setState(partial: Partial<HudState>): void;
  updateDebug(debug: Partial<HudDebugInfo>): void;
};

const DEFAULT_STATE: HudState = {
  debug: {
    cameraX: 0,
    cameraY: 0,
    playerX: 0,
    playerY: 0,
    fps: 0,
    stepMs: 0,
    entities: 0,
    showHitboxes: false
  },
  volume: 0.5,
  musicPlaying: false
};

export function createHudStore(initial: Partial<HudState> = {}): HudStore {
  let state: HudState = {
    ...DEFAULT_STATE,
    ...initial,
    debug: {
      ...DEFAULT_STATE.debug,
      ...(initial.debug ?? {})
    }
  };

  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    getState() {
      return state;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState(partial) {
      state = {
        ...state,
        ...partial,
        debug: {
          ...state.debug,
          ...(partial.debug ?? {})
        }
      };
      notify();
    },
    updateDebug(debugPartial) {
      state = {
        ...state,
        debug: {
          ...state.debug,
          ...debugPartial
        }
      };
      notify();
    }
  };
}
