import { useCallback, useEffect, useRef } from 'react';

const MAX_HOVER_TILT_DEG = 12;
const MAX_AMBIENT_TILT_DEG = 4.2;
const MAX_DEVICE_TILT_DEG = 13;
const PARALLAX_PX = 3;
const SETTLE_EPSILON = 0.015;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createPose = () => ({ rx: 0, ry: 0, gx: 0, gy: 0, glare: 0, lift: 0 });

// Shared singleton coordinator avoids duplicate window listeners & RAF loops across cards
const gyroCoordinator = {
  cards: new Set(),
  ambientTarget: createPose(),
  hasDeviceGyro: false,
  baseBeta: null,
  baseGamma: null,
  vw: 1,
  vh: 1,
  reducedMotion: false,
  rafId: null,
  lastTime: 0,
  isListening: false,
  motionQuery: null,
};

function applyCardTransforms(entry) {
  const { current, frameRef, glareRef, artRef } = entry;

  if (frameRef.current) {
    frameRef.current.style.transform = `translate3d(0, ${current.lift.toFixed(2)}px, 0) rotateX(${current.rx.toFixed(2)}deg) rotateY(${current.ry.toFixed(2)}deg)`;
  }

  if (glareRef.current) {
    glareRef.current.style.transform = `translate3d(${current.gx.toFixed(2)}%, ${current.gy.toFixed(2)}%, 0)`;
    glareRef.current.style.opacity = current.glare.toFixed(3);
  }

  if (artRef.current) {
    const px = (current.ry / MAX_HOVER_TILT_DEG) * PARALLAX_PX;
    const py = (-current.rx / MAX_HOVER_TILT_DEG) * PARALLAX_PX;
    artRef.current.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) scale(1.025)`;
  }
}

function resetEntryToNeutral(entry) {
  entry.isHovered = false;
  entry.isSettled = true;
  entry.current = createPose();
  entry.target = createPose();
  applyCardTransforms(entry);
}

function wakeAmbientEntries() {
  for (const entry of gyroCoordinator.cards) {
    if (!entry.isHovered && !entry.isPaused) {
      entry.isSettled = false;
    }
  }
}

function scheduleSharedTick() {
  if (gyroCoordinator.rafId !== null || gyroCoordinator.reducedMotion) return;
  gyroCoordinator.lastTime = performance.now();

  const step = (now) => {
    gyroCoordinator.rafId = null;
    if (gyroCoordinator.reducedMotion || gyroCoordinator.cards.size === 0) return;

    const dt = Math.min((now - gyroCoordinator.lastTime) * 0.001, 0.05);
    gyroCoordinator.lastTime = now;
    const ease = 1 - Math.exp(-11 * Math.max(dt, 0.001));

    let anyMoving = false;

    for (const entry of gyroCoordinator.cards) {
      if (entry.isPaused || entry.isSettled) continue;

      const t = entry.isHovered ? entry.target : gyroCoordinator.ambientTarget;
      const c = entry.current;

      c.rx += (t.rx - c.rx) * ease;
      c.ry += (t.ry - c.ry) * ease;
      c.gx += (t.gx - c.gx) * ease;
      c.gy += (t.gy - c.gy) * ease;
      c.glare += (t.glare - c.glare) * ease;
      c.lift += (t.lift - c.lift) * ease;

      const maxDelta = Math.max(
        Math.abs(t.rx - c.rx),
        Math.abs(t.ry - c.ry),
        Math.abs(t.gx - c.gx),
        Math.abs(t.gy - c.gy),
        Math.abs(t.glare - c.glare) * 20,
        Math.abs(t.lift - c.lift)
      );

      if (maxDelta > SETTLE_EPSILON) {
        anyMoving = true;
      } else {
        Object.assign(c, t);
        entry.isSettled = true;
      }

      applyCardTransforms(entry);
    }

    if (anyMoving) {
      gyroCoordinator.rafId = requestAnimationFrame(step);
    }
  };

  gyroCoordinator.rafId = requestAnimationFrame(step);
}

function updateViewportSize() {
  gyroCoordinator.vw = window.innerWidth || 1;
  gyroCoordinator.vh = window.innerHeight || 1;
}

function handleSharedPointerMove(e) {
  if (gyroCoordinator.hasDeviceGyro || e.pointerType === 'touch') return;
  const vx = clamp((e.clientX / gyroCoordinator.vw) * 2 - 1, -1, 1);
  const vy = clamp((e.clientY / gyroCoordinator.vh) * 2 - 1, -1, 1);

  const a = gyroCoordinator.ambientTarget;
  a.rx = -vy * MAX_AMBIENT_TILT_DEG;
  a.ry = vx * MAX_AMBIENT_TILT_DEG;
  a.gx = vx * 22;
  a.gy = vy * 22;
  a.glare = 0.2;
  a.lift = 0;
  wakeAmbientEntries();
  scheduleSharedTick();
}

function handleSharedMouseOut(e) {
  if (!e.relatedTarget && !gyroCoordinator.hasDeviceGyro) {
    gyroCoordinator.ambientTarget = createPose();
    wakeAmbientEntries();
    scheduleSharedTick();
  }
}

function handleSharedDeviceOrientation(e) {
  if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
  gyroCoordinator.hasDeviceGyro = true;

  if (gyroCoordinator.baseBeta === null || gyroCoordinator.baseGamma === null) {
    gyroCoordinator.baseBeta = e.beta;
    gyroCoordinator.baseGamma = e.gamma;
  }

  const dBeta = clamp((e.beta - gyroCoordinator.baseBeta) / 35, -1, 1);
  const dGamma = clamp((e.gamma - gyroCoordinator.baseGamma) / 35, -1, 1);

  const a = gyroCoordinator.ambientTarget;
  a.rx = -dBeta * MAX_DEVICE_TILT_DEG;
  a.ry = dGamma * MAX_DEVICE_TILT_DEG;
  a.gx = dGamma * 34;
  a.gy = dBeta * 34;
  a.glare = 0.25 + (Math.hypot(dBeta, dGamma) / 1.414) * 0.35;
  a.lift = 0;
  wakeAmbientEntries();
  scheduleSharedTick();
}

function handleMotionPreferenceChange(e) {
  gyroCoordinator.reducedMotion = e.matches;
  if (gyroCoordinator.reducedMotion) {
    if (gyroCoordinator.rafId !== null) {
      cancelAnimationFrame(gyroCoordinator.rafId);
      gyroCoordinator.rafId = null;
    }
    gyroCoordinator.ambientTarget = createPose();
    for (const entry of gyroCoordinator.cards) {
      resetEntryToNeutral(entry);
    }
  }
}

function requestIOSGyroIfNeeded() {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    DeviceOrientationEvent.requestPermission().catch(() => {});
  }
  window.removeEventListener('pointerdown', requestIOSGyroIfNeeded);
}

function attachSharedListeners() {
  if (gyroCoordinator.isListening || typeof window === 'undefined') return;
  gyroCoordinator.isListening = true;

  updateViewportSize();
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  gyroCoordinator.motionQuery = mq;
  gyroCoordinator.reducedMotion = Boolean(mq?.matches);
  mq?.addEventListener?.('change', handleMotionPreferenceChange);

  window.addEventListener('resize', updateViewportSize, { passive: true });
  window.addEventListener('pointermove', handleSharedPointerMove, { passive: true });
  document.addEventListener('mouseout', handleSharedMouseOut, { passive: true });

  if ('DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', handleSharedDeviceOrientation, { passive: true });
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('pointerdown', requestIOSGyroIfNeeded, { passive: true, once: true });
    }
  }
}

function detachSharedListenersIfEmpty() {
  if (!gyroCoordinator.isListening || gyroCoordinator.cards.size > 0) return;
  gyroCoordinator.isListening = false;

  if (gyroCoordinator.rafId !== null) {
    cancelAnimationFrame(gyroCoordinator.rafId);
    gyroCoordinator.rafId = null;
  }

  gyroCoordinator.motionQuery?.removeEventListener?.('change', handleMotionPreferenceChange);
  gyroCoordinator.motionQuery = null;

  window.removeEventListener('resize', updateViewportSize);
  window.removeEventListener('pointermove', handleSharedPointerMove);
  document.removeEventListener('mouseout', handleSharedMouseOut);
  window.removeEventListener('deviceorientation', handleSharedDeviceOrientation);
  window.removeEventListener('pointerdown', requestIOSGyroIfNeeded);
}

export function useCardGyroscope({ isPaused = false } = {}) {
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const glareRef = useRef(null);
  const artRef = useRef(null);

  const entryRef = useRef(null);
  if (!entryRef.current) {
    entryRef.current = {
      stageRef,
      frameRef,
      glareRef,
      artRef,
      current: createPose(),
      target: createPose(),
      isHovered: false,
      isSettled: true,
      isPaused,
      cachedRect: null,
    };
  }

  useEffect(() => {
    const entry = entryRef.current;
    entry.isPaused = isPaused;
    if (isPaused) {
      resetEntryToNeutral(entry);
    }
  }, [isPaused]);

  useEffect(() => {
    const entry = entryRef.current;
    gyroCoordinator.cards.add(entry);
    attachSharedListeners();

    return () => {
      gyroCoordinator.cards.delete(entry);
      detachSharedListenersIfEmpty();
    };
  }, []);

  const handlePointerEnter = useCallback(() => {
    const entry = entryRef.current;
    if (gyroCoordinator.reducedMotion || entry.isPaused) return;
    entry.isHovered = true;
    entry.cachedRect = stageRef.current?.getBoundingClientRect() || null;
  }, []);

  const handlePointerMove = useCallback((e) => {
    const entry = entryRef.current;
    if (gyroCoordinator.reducedMotion || entry.isPaused || e.pointerType === 'touch') return;
    entry.isHovered = true;
    entry.isSettled = false;

    let rect = entry.cachedRect;
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      rect = stageRef.current?.getBoundingClientRect() || null;
      entry.cachedRect = rect;
    }
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

    entry.target.rx = -ny * MAX_HOVER_TILT_DEG;
    entry.target.ry = nx * MAX_HOVER_TILT_DEG;
    entry.target.gx = nx * 36;
    entry.target.gy = ny * 36;
    entry.target.glare = 0.48;
    entry.target.lift = -5;
    scheduleSharedTick();
  }, []);

  const handlePointerLeave = useCallback(() => {
    const entry = entryRef.current;
    entry.isHovered = false;
    entry.isSettled = false;
    entry.cachedRect = null;
    scheduleSharedTick();
  }, []);

  return {
    stageRef,
    frameRef,
    glareRef,
    artRef,
    gyroHandlers: {
      onPointerEnter: handlePointerEnter,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}
