import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import type {
  ChangeEvent,
  ComponentPropsWithoutRef,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from 'react';

import { playClick, setMasterVolume, toggleMusic, isMusicPlaying } from '../app/systems/audio';
import type { HudStore } from './hudStore';

interface HudAppProps {
  store: HudStore;
}

const DRAG_HANDLE_SELECTOR = "[data-drag-handle='true']";

interface DraggableWindowProps extends ComponentPropsWithoutRef<'section'> {
  initialPosition: { x: number; y: number };
  children: ReactNode;
}

function DraggableWindow({ initialPosition, style, children, hidden, ...rest }: DraggableWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(position);
  const pointerIdRef = useRef<number | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(DRAG_HANDLE_SELECTOR)) {
        return;
      }

      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;

      const currentPosition = positionRef.current;
      offsetRef.current = {
        x: event.clientX - currentPosition.x,
        y: event.clientY - currentPosition.y
      };

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    []
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    setPosition({
      x: event.clientX - offsetRef.current.x,
      y: event.clientY - offsetRef.current.y
    });
  }, []);

  const stopDragging = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    pointerIdRef.current = null;
  }, []);

  return (
    <section
      {...rest}
      hidden={hidden}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      style={{
        ...style,
        position: 'absolute',
        left: position.x,
        top: position.y,
        pointerEvents: hidden ? 'none' : 'auto',
        touchAction: hidden ? 'auto' : 'none',
        visibility: hidden ? 'hidden' : 'visible',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 120ms ease'
      }}
    >
      {children}
    </section>
  );
}

export function HudApp({ store }: HudAppProps) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [hudVisible, setHudVisible] = useState(true);

  const volumePercent = useMemo(() => Math.round(state.volume * 100), [state.volume]);

  const handleToggleHudVisibility = () => {
    setHudVisible((value) => !value);
  };

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
      <div className="hud-toggle">
        <button
          type="button"
          onClick={handleToggleHudVisibility}
          className="hud-toggle__button"
          aria-label={hudVisible ? 'Hide HUD interface' : 'Show HUD interface'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm9.2 3.03-1.87-.66a7.1 7.1 0 0 0-.46-1.12l.98-1.72a.75.75 0 0 0-.21-.96l-1.68-1.22a.75.75 0 0 0-.98.08l-1.37 1.32c-.35-.18-.72-.32-1.1-.43l-.28-1.96A.75.75 0 0 0 13.5 5h-3a.75.75 0 0 0-.74.63l-.29 1.96c-.38.11-.75.25-1.1.43L6.99 6.7a.75.75 0 0 0-.98-.08L4.33 7.84a.75.75 0 0 0-.21.96l.99 1.72c-.2.36-.36.74-.47 1.13l-1.87.65A.75.75 0 0 0 2 12.99v2.04c0 .33.21.61.53.71l1.87.66c.11.38.27.76.47 1.13l-.99 1.72a.75.75 0 0 0 .21.96l1.68 1.22a.75.75 0 0 0 .98-.08l1.37-1.32c.35.18.72.32 1.1.43l.29 1.96c.05.37.37.64.74.64h3c.37 0 .69-.27.74-.63l.29-1.96c.38-.11.75-.25 1.1-.43l1.37 1.32a.75.75 0 0 0 .98.08l1.68-1.22a.75.75 0 0 0 .21-.96l-.99-1.72c.2-.36.36-.74.47-1.13l1.87-.66a.75.75 0 0 0 .53-.71V12.5a.75.75 0 0 0-.53-.71Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <DraggableWindow className="hud-panel" initialPosition={{ x: 24, y: 24 }} hidden={!hudVisible}>
        <header className="hud-panel__heading" data-drag-handle="true">
          HUD
        </header>
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
      </DraggableWindow>
      <DraggableWindow
        className="hud-debug"
        role="status"
        initialPosition={{ x: 24, y: 380 }}
        hidden={!hudVisible}
      >
        <div className="hud-debug__handle" data-drag-handle="true">
          Debug Metrics
        </div>
        <div>Camera: ({state.debug.cameraX.toFixed(1)}, {state.debug.cameraY.toFixed(1)})</div>
        <div>Player: ({state.debug.playerX.toFixed(1)}, {state.debug.playerY.toFixed(1)})</div>
        <div>FPS: {state.debug.fps.toFixed(1)}</div>
        <div>Step: {state.debug.stepMs.toFixed(2)} ms</div>
        <div>Entities: {state.debug.entities}</div>
        <div>Hitboxes: {state.debug.showHitboxes ? 'Visible' : 'Hidden'}</div>
        <div>Grounded: {state.debug.playerGrounded ? 'Yes' : 'No'}</div>
      </DraggableWindow>
    </div>
  );
}
