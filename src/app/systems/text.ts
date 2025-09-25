import { Assets, BitmapText, Text, TextStyle } from 'pixi.js';

import arcadeFontUrl from '../assets/fonts/arcade.fnt?url';

let bitmapFontLoaded = false;

export async function createTextExamples() {
  const styled = new Text({
    text: 'Pixi Starter Pack',
    style: new TextStyle({
      fill: 0xffffff,
      fontFamily: 'Inter, sans-serif',
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 1
    })
  });
  styled.eventMode = 'none';

  if (!bitmapFontLoaded) {
    try {
      await Assets.load({ alias: 'arcade-font', src: arcadeFontUrl });
      bitmapFontLoaded = true;
    } catch (error) {
      console.warn('Bitmap font failed to load. Continuing without it.', error);
    }
  }

  const bitmap = bitmapFontLoaded
    ? new BitmapText({
        text: 'SCORE 0000',
        style: { fontName: 'arcade', fontSize: 24 }
      })
    : null;

  if (bitmap) {
    bitmap.y = 28;
  }

  return { styled, bitmap } as const;
}
