import { mulberry32, resolveSeed, getModelUrl } from './utils';
import { loader } from './scene';
import { getHeightAt } from './terrain';
import { isOnPath } from './path';
import { spawnInstancedMeshes, Placement } from './forest';
import config from './data/config.json';

const cfg = config.flowerPatches;

export const buildFlowerPatches = async (): Promise<void> => {
  const rng = mulberry32(resolveSeed(cfg.seed));
  const gltfs = await Promise.all(cfg.models.map(m => loader.loadAsync(getModelUrl(m))));

  // Scatter patch centres across the world. sqrt(rng()) radius gives uniform
  // density on a disk — without the sqrt, points cluster toward the centre.
  // (Disk point picking: mathworld.wolfram.com/DiskPointPicking.html)
  // The 12× attempt budget absorbs rejects from the minimum-spacing check.
  const patchCenters: Array<{ x: number; z: number }> = [];
  const maxAttempts = cfg.count * 12;
  for (let attempt = 0; attempt < maxAttempts && patchCenters.length < cfg.count; attempt++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * cfg.worldRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (patchCenters.every(p => Math.hypot(p.x - x, p.z - z) >= cfg.patchSpacing)) {
      patchCenters.push({ x, z });
    }
  }

  // Scatter individual flowers within each patch. All RNG calls are consumed
  // before the isOnPath check so the sequence stays deterministic even when
  // a flower is skipped.
  const placements: Placement[] = [];
  for (const center of patchCenters) {
    const count = cfg.flowersMin + Math.floor(rng() * (cfg.flowersMax - cfg.flowersMin + 1));
    for (let f = 0; f < count; f++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * cfg.patchSpread;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;
      const rotation = rng() * Math.PI * 2;
      const scale = cfg.scaleMin + rng() * (cfg.scaleMax - cfg.scaleMin);
      const variantIdx = Math.floor(rng() * gltfs.length);
      if (!isOnPath(x, z)) {
        placements.push({ x, y: getHeightAt(x, z), z, rotation, scale, variantIdx });
      }
    }
  }

  spawnInstancedMeshes(gltfs, placements);
};
