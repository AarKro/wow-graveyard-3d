import config from './data/config.json';

const cfg = config.path;
const gcfg = config.graves;

const graveRows = Math.ceil(gcfg.tombstones.length / gcfg.cols);
const GRAVEYARD_END_Z = -(graveRows - 1) / 2 * gcfg.rowSpacing - gcfg.rowSpacing / 2;

const tileHash = (wx: number, wz: number): number =>
  Math.abs(Math.sin(wx * 127.1 + wz * 311.7) * 43758.5453) % 1;

export const isOnPath = (worldX: number, worldZ: number): boolean => {
  // ── Approach phase: snaking, solid, no fade ───────────────────────────────
  if (worldZ >= cfg.endZ && worldZ <= cfg.startZ) {
    const t = (worldZ - cfg.endZ) / (cfg.startZ - cfg.endZ);
    const cx = cfg.snakeAmplitude * Math.sin(Math.PI * t) * Math.sin(cfg.snakeFrequency * worldZ);
    return Math.abs(worldX - cx) <= cfg.width / 2;
  }

  // ── Graveyard phase: gentle wander, fades at far end ─────────────────────
  // Two incommensurable frequencies phased from endZ so cx=0 at the seam.
  if (worldZ >= GRAVEYARD_END_Z && worldZ < cfg.endZ) {
    const dz = worldZ - cfg.endZ;
    const cx = 1.5 * Math.sin(0.12 * dz) + 0.8 * Math.sin(0.19 * dz);
    if (Math.abs(worldX - cx) > cfg.width / 2) return false;
    const density = Math.min(1, (worldZ - GRAVEYARD_END_Z) / cfg.fadeLength);
    return tileHash(worldX, worldZ) < density;
  }

  return false;
};
