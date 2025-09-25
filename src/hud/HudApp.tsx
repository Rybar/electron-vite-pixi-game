import { useMemo, useSyncExternalStore } from 'react';
import type { ChangeEvent } from 'react';

import { playClick, setMasterVolume, toggleMusic, isMusicPlaying } from '../app/systems/audio';
import type { HudStore } from './hudStore';

interface HudAppProps {
  store: HudStore;
}

export function HudApp({ store }: HudAppProps) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const volumePercent = useMemo(() => Math.round(state.volume * 100), [state.volume]);

  const handleToggleHitboxes = () => {
    store.updateDebug({ showHitboxes: !state.debug.showHitboxes });
  };

  const handleToggleAudio = () => {
    toggleMusic();
    playClick();
    store.setState({ musicPlaying: isMusicPlaying() });
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    const clamped = Math.max(0, Math.min(1, value));
    setMasterVolume(clamped);
    store.setState({ volume: clamped });
  };

  return (
    <div className="hud-overlay" aria-live="polite">
      <section className="hud-panel">
        <header className="hud-panel__heading">HUD ONLINE</header>
        <p className="hud-panel__copy">System diagnostics nominal. Audio controls available below.</p>
        <div className="hud-controls">
          <button type="button" className="hud-button" onClick={handleToggleAudio}>
            {state.musicPlaying ? 'Pause Music' : 'Play Music'}
          </button>
          <button type="button" className="hud-button" onClick={handleToggleHitboxes}>
            {state.debug.showHitboxes ? 'Hide Hitboxes' : 'Show Hitboxes'}
          </button>
          <label className="hud-slider">
            Master Volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={handleVolumeChange}
            />
            <span className="value-chip">{volumePercent}%</span>
          </label>
        </div>
      </section>
      <section className="hud-debug" role="status">
        <div>Camera: ({state.debug.cameraX.toFixed(1)}, {state.debug.cameraY.toFixed(1)})</div>
        <div>Player: ({state.debug.playerX.toFixed(1)}, {state.debug.playerY.toFixed(1)})</div>
        <div>FPS: {state.debug.fps.toFixed(1)}</div>
        <div>Step: {state.debug.stepMs.toFixed(2)} ms</div>
        <div>Entities: {state.debug.entities}</div>
        <div>Hitboxes: {state.debug.showHitboxes ? 'Visible' : 'Hidden'}</div>
      </section>
    </div>
  );
}
