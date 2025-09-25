import { Button, Slider } from '@pixi/ui';
import {
  Container,
  NineSliceSprite,
  Sprite,
  Text,
  Texture,
  type Application,
  TextStyle
} from 'pixi.js';

export interface HudElements {
  hud: Container;
  audioBtn: Button;
  volume: Slider;
  heading: Text;
}

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 140;
const BUTTON_WIDTH = 144;
const BUTTON_HEIGHT = 40;

function createRectSprite(width: number, height: number, color: number, alpha = 1) {
  const sprite = Sprite.from(Texture.WHITE);
  sprite.width = width;
  sprite.height = height;
  sprite.tint = color;
  sprite.alpha = alpha;
  return sprite;
}

export function createHUD(app: Application, onToggleAudio: () => void): HudElements {
  const hud = new Container();
  hud.eventMode = 'static';
  hud.sortableChildren = true;

  const panel = new NineSliceSprite(Texture.WHITE, 8, 8, 8, 8);
  panel.tint = 0x111322;
  panel.alpha = 0.85;
  panel.width = PANEL_WIDTH;
  panel.height = PANEL_HEIGHT;
  panel.zIndex = 0;
  hud.addChild(panel);

  const buttonContainer = new Container();
  const buttonBg = createRectSprite(BUTTON_WIDTH, BUTTON_HEIGHT, 0x2d9cdb, 0.92);
  buttonBg.roundPixels = true;
  const buttonLabel = new Text({
    text: 'Toggle Audio',
    style: new TextStyle({
      fill: 0xffffff,
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      letterSpacing: 0.5
    })
  });
  buttonLabel.anchor.set(0.5);
  buttonLabel.position.set(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2);

  buttonContainer.addChild(buttonBg, buttonLabel);
  buttonContainer.position.set(20, 20);

  const audioBtn = new Button(buttonContainer);
  audioBtn.onPress.connect(onToggleAudio);

  const sliderBg = createRectSprite(200, 12, 0xffffff, 0.18);
  const sliderFill = createRectSprite(200, 12, 0x26a69a, 0.9);
  const sliderHandle = createRectSprite(20, 20, 0xffffff, 1);

  const volume = new Slider({
    bg: sliderBg,
    fill: sliderFill,
    slider: sliderHandle,
    min: 0,
    max: 1,
    step: 0.01,
    value: 0
  });

  volume.position.set(20, 84);

  const heading = new Text({
    text: 'HUD ONLINE',
    style: new TextStyle({
      fill: 0xbad7ff,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      letterSpacing: 1.2
    })
  });
  heading.position.set(20, 114);

  hud.addChild(audioBtn.view, volume, heading);

  hud.position.set(16, 16);
  app.stage.addChild(hud);

  return { hud, audioBtn, volume, heading };
}
