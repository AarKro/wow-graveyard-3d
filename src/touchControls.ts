import nipplejs from 'nipplejs';
import { isTouch, enterTouch, setTouchMove, setTouchLook } from './player';

// Best-effort: go fullscreen and lock to landscape. iOS Safari rejects
// orientation.lock (and sometimes fullscreen), so failures are swallowed —
// the CSS "rotate your device" notice is the fallback for those cases.
const requestLandscape = async (): Promise<void> => {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch { /* ignore */ }
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    await orientation?.lock?.('landscape');
  } catch { /* ignore */ }
};

const createJoysticks = (): void => {
  const left = document.getElementById('joystick-left') as HTMLElement;
  const right = document.getElementById('joystick-right') as HTMLElement;

  const move = nipplejs.create({
    zone: left,
    mode: 'static',
    position: { left: '50%', bottom: '40%' },
    color: 'rgba(232, 213, 163, 0.7)',
    size: 120,
    restJoystick: true,
  });
  move.on('move', (evt) => setTouchMove(evt.data.vector.x, evt.data.vector.y));
  move.on('end', () => setTouchMove(0, 0));

  const look = nipplejs.create({
    zone: right,
    mode: 'static',
    position: { right: '50%', bottom: '40%' },
    color: 'rgba(232, 213, 163, 0.7)',
    size: 120,
    restJoystick: true,
  });
  look.on('move', (evt) => setTouchLook(evt.data.vector.x, evt.data.vector.y));
  look.on('end', () => setTouchLook(0, 0));
};

export const initTouchControls = (): void => {
  if (!isTouch) return;

  const cta = document.getElementById('overlay-cta');
  if (cta) cta.textContent = 'Tap anywhere to enter';

  const overlay = document.getElementById('overlay') as HTMLElement;
  const container = document.getElementById('touch-controls') as HTMLElement;

  let started = false;
  const start = (): void => {
    if (started) return;
    started = true;
    void requestLandscape();
    enterTouch();
    container.classList.add('active');
    createJoysticks();
  };

  // The GitHub link already calls stopPropagation, so it won't trigger entry.
  overlay.addEventListener('click', start);
};
