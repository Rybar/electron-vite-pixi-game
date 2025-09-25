import { Ticker } from 'pixi.js';

export interface FixedStepOptions {
  hz?: number;
  maxAccumulatedTime?: number;
}

export interface FixedStepStats {
  readonly fixedDt: number;
  readonly accumulator: number;
  readonly stepsLastFrame: number;
  readonly lastStepDurationMs: number;
}

export interface FixedStepController {
  pause(): void;
  resume(): void;
  detach(): void;
  getStats(): FixedStepStats;
  getInterpolationAlpha(): number;
  isPaused(): boolean;
}

export function startFixedStep(
  ticker: Ticker,
  stepFn: (dtSeconds: number) => void,
  options: FixedStepOptions = {}
): FixedStepController {
  const fixedHz = Math.max(1, options.hz ?? 60);
  const fixedDt = 1 / fixedHz;
  const maxAccumulated = options.maxAccumulatedTime ?? 0.25;

  let accumulator = 0;
  let lastTime = performance.now() / 1000;
  let paused = false;

  let stepsLastFrame = 0;
  let lastStepDurationMs = 0;

  const update = () => {
    if (paused) {
      lastTime = performance.now() / 1000;
      stepsLastFrame = 0;
      return;
    }

    const now = performance.now() / 1000;
    const frameElapsed = Math.min(maxAccumulated, now - lastTime);
    lastTime = now;

    accumulator += frameElapsed;
    stepsLastFrame = 0;

    while (accumulator >= fixedDt) {
      const stepStart = performance.now();
      stepFn(fixedDt);
      lastStepDurationMs = performance.now() - stepStart;

      accumulator -= fixedDt;
      stepsLastFrame += 1;
    }
  };

  ticker.add(update);

  return {
    pause() {
      paused = true;
    },
    resume() {
      if (!paused) {
        return;
      }
      paused = false;
      lastTime = performance.now() / 1000;
    },
    detach() {
      ticker.remove(update);
    },
    getStats(): FixedStepStats {
      return {
        fixedDt,
        accumulator,
        stepsLastFrame,
        lastStepDurationMs
      };
    },
    getInterpolationAlpha(): number {
      return accumulator / fixedDt;
    },
    isPaused() {
      return paused;
    }
  };
}
