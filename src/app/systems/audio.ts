import { sound } from '@pixi/sound';

import clickSfxUrl from '../assets/audio/click.mp3';
import bgLoopUrl from '../assets/audio/loop.mp3';

let audioReady = false;

export async function initAudio() {
  if (audioReady) {
    return;
  }

  try {
    await sound.add('click', { url: clickSfxUrl });
  } catch (error) {
    console.warn('Unable to load click sound effect', error);
  }

  try {
    await sound.add('bg', { url: bgLoopUrl, loop: true, volume: 0.5 });
  } catch (error) {
    console.warn('Unable to load background loop', error);
  }

  audioReady = true;
}

export function toggleMusic() {
  const bg = sound.find('bg');
  if (!bg) return;

  if (bg.isPlaying) {
    bg.pause();
  } else {
    bg.play();
  }
}

export function setMasterVolume(volume: number) {
  sound.volumeAll = Math.max(0, Math.min(1, volume));
}

export function playClick() {
  if (!audioReady) return;
  sound.play('click');
}

export function isMusicPlaying() {
  const bg = sound.find('bg');
  return bg?.isPlaying ?? false;
}
