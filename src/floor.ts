import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { SCENE_UTIL } from './utils';

export const TILE_SIZE = 2;
export const GRID_SIZE = 150;
export const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2; // 300 units from center

const HEIGHT_SCALE = 10;  // max height variation in world units (snapped to TILE_SIZE steps)
const NOISE_SCALE = 0.015; // lower = broader, smoother hills
const BOX_DEPTH = 20;     // how far each column extends below the surface

const SEED = 42;
const mulberry32 = (s: number) => () => {
  s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const noise2D = createNoise2D(mulberry32(SEED));

/**
 * heightMap[gz][gx] holds the Y position of the top face of the tile at grid cell (gx, gz).
 * Built once at module load using multi-octave Perlin noise for a natural terrain look.
 */
export const heightMap: number[][] = Array.from({ length: GRID_SIZE }, (_, gz) =>
  Array.from({ length: GRID_SIZE }, (_, gx) => {
    const nx = gx * NOISE_SCALE;
    const nz = gz * NOISE_SCALE;
    // Three octaves: coarse shape + medium detail + fine texture
    const h =
      noise2D(nx,          nz         ) * 0.60 +
      noise2D(nx * 2.1,    nz * 2.1   ) * 0.25 +
      noise2D(nx * 4.7,    nz * 4.7   ) * 0.15;
    // Remap from [-1, 1] → [0, HEIGHT_SCALE], then snap to TILE_SIZE steps for voxel look
    const raw = ((h + 1) * 0.5) * HEIGHT_SCALE;
    return Math.round(raw / TILE_SIZE) * TILE_SIZE;
  })
);

/**
 * Returns the terrain height (top of tile) at the given world-space position.
 * Clamps to the grid boundary so positions outside the world return the edge height.
 */
export const getHeightAt = (worldX: number, worldZ: number): number => {
  const gx = Math.floor((worldX + HALF_WORLD) / TILE_SIZE);
  const gz = Math.floor((worldZ + HALF_WORLD) / TILE_SIZE);
  const cx = Math.max(0, Math.min(GRID_SIZE - 1, gx));
  const cz = Math.max(0, Math.min(GRID_SIZE - 1, gz));
  return heightMap[cz][cx];
};

/**
 * Builds and adds the procedural floor to the scene.
 *
 * Strategy:
 *  1. Generate a GRID_SIZE x GRID_SIZE heightmap via Perlin noise.
 *  2. Create a single InstancedMesh (one draw call for all tiles).
 *  3. Each instance is a box column: its top face sits at the noise height,
 *     and it extends BOX_DEPTH units downward so no gaps show on slopes.
 */
const COLOR_LOW  = new THREE.Color(0x2a4d1a); // dark green (valleys)
const COLOR_HIGH = new THREE.Color(0x8fc45a); // light green (peaks)

export const buildFloor = (): void => {
  const tileCount = GRID_SIZE * GRID_SIZE;

  const geometry = new THREE.BoxGeometry(TILE_SIZE, BOX_DEPTH, TILE_SIZE);
  const material = new THREE.MeshPhongMaterial({ vertexColors: false });

  const mesh = new THREE.InstancedMesh(geometry, material, tileCount);
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const color  = new THREE.Color();
  let idx = 0;

  for (let gz = 0; gz < GRID_SIZE; gz++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const topY    = heightMap[gz][gx];
      const wx      = -HALF_WORLD + gx * TILE_SIZE + TILE_SIZE / 2;
      const wz      = -HALF_WORLD + gz * TILE_SIZE + TILE_SIZE / 2;
      const centerY = topY - BOX_DEPTH / 2;

      matrix.setPosition(wx, centerY, wz);
      mesh.setMatrixAt(idx, matrix);

      color.lerpColors(COLOR_LOW, COLOR_HIGH, topY / HEIGHT_SCALE);
      mesh.setColorAt(idx, color);

      idx++;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  SCENE_UTIL.scene.add(mesh);
};
