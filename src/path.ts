import config from './data/config.json';

const cfg = config.path;

// Cheap per-tile hash — deterministic, no RNG state needed.
const tileHash = (wx: number, wz: number): number =>
  Math.abs(Math.sin(wx * 127.1 + wz * 311.7) * 43758.5453) % 1;

export const isOnPath = (worldX: number, worldZ: number): boolean => {
  if (worldZ < cfg.endZ || worldZ > cfg.startZ) return false;

  // t=0 at graveyard end, t=1 at spawn. sin(π·t) envelope forces centerX=0
  // at both ends so the path arrives centered on the graveyard.
  const t = (worldZ - cfg.endZ) / (cfg.startZ - cfg.endZ);
  const cx = cfg.snakeAmplitude * Math.sin(Math.PI * t) * Math.sin(cfg.snakeFrequency * worldZ);

  if (Math.abs(worldX - cx) > cfg.width / 2) return false;

  // Fade out toward endZ by randomly dropping tiles.
  const density = Math.min(1, (worldZ - cfg.endZ) / cfg.fadeLength);
  return tileHash(worldX, worldZ) < density;
};
