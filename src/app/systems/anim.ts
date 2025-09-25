import * as PIXI from 'pixi.js';
import type { DisplayObject } from 'pixi.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

let registered = false;

function ensurePlugin() {
  if (registered) return;
  PixiPlugin.registerPIXI(PIXI);
  gsap.registerPlugin(PixiPlugin);
  registered = true;
}

export function pulse(target: DisplayObject) {
  ensurePlugin();
  gsap.to(target, {
    duration: 0.3,
    yoyo: true,
    repeat: 1,
    ease: 'sine.inOut',
    pixi: { scale: 1.2 }
  });
}
