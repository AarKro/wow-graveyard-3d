import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { SCENE_UTIL } from './utils';

export const TILE_SIZE = 6;
export const GRID_SIZE = 100;
export const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2; // 300 units from center

const HEIGHT_SCALE = 4;   // max height variation in world units
const NOISE_SCALE = 0.02; // lower = broader, smoother hills
const BOX_DEPTH = 20;     // how far each column extends below the surface

const noise2D = createNoise2D();

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
    // Remap from [-1, 1] → [0, HEIGHT_SCALE]
    return ((h + 1) * 0.5) * HEIGHT_SCALE;
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
export const buildFloor = (): void => {
  const tileCount = GRID_SIZE * GRID_SIZE;

  // Tiny gap between tiles (0.08) gives visual tile definition without ugly holes
  const geometry = new THREE.BoxGeometry(TILE_SIZE - 0.08, BOX_DEPTH, TILE_SIZE - 0.08);
  const material = new THREE.MeshPhongMaterial({ color: 0x3d6b2e }); // dark grass green

  const mesh = new THREE.InstancedMesh(geometry, material, tileCount);
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  let idx = 0;

  for (let gz = 0; gz < GRID_SIZE; gz++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const topY   = heightMap[gz][gx];
      const wx     = -HALF_WORLD + gx * TILE_SIZE + TILE_SIZE / 2;
      const wz     = -HALF_WORLD + gz * TILE_SIZE + TILE_SIZE / 2;
      // Box center is half-depth below the surface so the top face is exactly at topY
      const centerY = topY - BOX_DEPTH / 2;

      matrix.setPosition(wx, centerY, wz);
      mesh.setMatrixAt(idx++, matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  SCENE_UTIL.scene.add(mesh);
};
