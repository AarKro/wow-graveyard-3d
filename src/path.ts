import config from './data/config.json';

const cfg = config.path;
const gravesCfg = config.graves;

const GRAVE_ROWS = Math.ceil(gravesCfg.tombstones.length / gravesCfg.cols);
// Z coordinate just past the last grave row — the far end of the graveyard from the player's spawn.
const GRAVEYARD_FAR_Z = -(GRAVE_ROWS - 1) / 2 * gravesCfg.rowSpacing - gravesCfg.rowSpacing / 2;

// Per-tile pseudo-random value derived from world position alone, no RNG state needed.
// Exploits the chaotic output of sin for large arguments as a cheap hash function.
// Technique from The Book of Shaders ch.10: thebookofshaders.com/10/
const tileHash = (wx: number, wz: number): number =>
  Math.abs(Math.sin(wx * 127.1 + wz * 311.7) * 43758.5453) % 1;

export const isOnPath = (worldX: number, worldZ: number): boolean => {
  // Approach phase: solid, snaking path from spawn to the graveyard entrance.
  // The sin(πt) envelope pins the centreline to x=0 at both ends (t=0 at the
  // entrance, t=1 at spawn), so the path always arrives centred on the graveyard.
  if (worldZ >= cfg.endZ && worldZ <= cfg.startZ) {
    const t = (worldZ - cfg.endZ) / (cfg.startZ - cfg.endZ);
    const cx = cfg.snakeAmplitude * Math.sin(Math.PI * t) * Math.sin(cfg.snakeFrequency * worldZ);
    return Math.abs(worldX - cx) <= cfg.width / 2;
  }

  // Graveyard phase: gently wandering path between the two grave columns,
  // fading out past the last row via per-tile random dropout.
  // Two sines whose period ratio (0.12 / 0.19 ≈ 0.63) produces no short repeat,
  // so the wander appears non-repeating across the ~80-unit graveyard length.
  // Both terms are offset by endZ so the centreline is exactly 0 at the seam
  // where this phase meets the approach phase.
  if (worldZ >= GRAVEYARD_FAR_Z && worldZ < cfg.endZ) {
    const relZ = worldZ - cfg.endZ;
    const cx = 1.5 * Math.sin(0.12 * relZ) + 0.8 * Math.sin(0.19 * relZ);
    if (Math.abs(worldX - cx) > cfg.width / 2) return false;
    const density = Math.min(1, (worldZ - GRAVEYARD_FAR_Z) / cfg.fadeLength);
    return tileHash(worldX, worldZ) < density;
  }

  return false;
};
