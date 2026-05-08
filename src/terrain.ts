import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { mulberry32, resolveSeed } from './utils';
import { scene } from './scene';
import { isOnPath } from './path';
import config from './data/config.json';

const TILE_SIZE = config.terrain.tileSize;
const GRID_SIZE = config.world.gridSize;
const CHUNK_SIZE = config.world.chunkSize;
const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2;

const HEIGHT_SCALE = config.terrain.heightScale;
const NOISE_SCALE = config.terrain.noiseScale;
const HEIGHT_FALLOFF = config.terrain.heightFalloff;
const BOX_DEPTH = config.terrain.tileDepth;
const SEED = resolveSeed(config.terrain.seed);

const noise2D = createNoise2D(mulberry32(SEED));

const heightMap: number[][] = Array.from({ length: GRID_SIZE }, (_, gridZ) =>
  Array.from({ length: GRID_SIZE }, (_, gridX) => {
    const worldX = -HALF_WORLD + gridX * TILE_SIZE + TILE_SIZE / 2;
    const worldZ = -HALF_WORLD + gridZ * TILE_SIZE + TILE_SIZE / 2;
    const t = Math.min(Math.sqrt(worldX * worldX + worldZ * worldZ) / HALF_WORLD, 1);
    const noiseX = gridX * NOISE_SCALE;
    const noiseZ = gridZ * NOISE_SCALE;
    // Fractional Brownian motion (fBm): three octaves of noise at increasing
    // frequencies and decreasing amplitudes layer coarse shape with fine detail.
    // https://en.wikipedia.org/wiki/Fractional_Brownian_motion
    const noiseValue =
      noise2D(noiseX,       noiseZ      ) * 0.60 +
      noise2D(noiseX * 2.1, noiseZ * 2.1) * 0.25 +
      noise2D(noiseX * 4.7, noiseZ * 4.7) * 0.15;
    const rawHeight = ((noiseValue + 1) * 0.5) * HEIGHT_SCALE;
    return Math.round(rawHeight * Math.pow(t, HEIGHT_FALLOFF) / TILE_SIZE) * TILE_SIZE;
  })
);

export const getHeightAt = (worldX: number, worldZ: number): number => {
  const gridX = Math.floor((worldX + HALF_WORLD) / TILE_SIZE);
  const gridZ = Math.floor((worldZ + HALF_WORLD) / TILE_SIZE);
  const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
  const clampedZ = Math.max(0, Math.min(GRID_SIZE - 1, gridZ));
  return heightMap[clampedZ][clampedX];
};

const COLOR_LOW = new THREE.Color(config.terrain.colorLow);
const COLOR_HIGH = new THREE.Color(config.terrain.colorHigh);
const COLOR_PATH = new THREE.Color(config.path.color);

const buildChunk = (
  chunkX: number,
  chunkZ: number,
  geometry: THREE.BoxGeometry,
  material: THREE.MeshPhongMaterial,
): void => {
  const mesh = new THREE.InstancedMesh(geometry, material, CHUNK_SIZE * CHUNK_SIZE);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let tileIndex = 0;

  for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      const gridX = chunkX * CHUNK_SIZE + localX;
      const gridZ = chunkZ * CHUNK_SIZE + localZ;
      const topY = heightMap[gridZ][gridX];
      const worldX = -HALF_WORLD + gridX * TILE_SIZE + TILE_SIZE / 2;
      const worldZ = -HALF_WORLD + gridZ * TILE_SIZE + TILE_SIZE / 2;
      const centerY = topY - BOX_DEPTH / 2;

      matrix.setPosition(worldX, centerY, worldZ);
      mesh.setMatrixAt(tileIndex, matrix);

      if (isOnPath(worldX, worldZ)) {
        color.copy(COLOR_PATH);
      } else {
        color.lerpColors(COLOR_LOW, COLOR_HIGH, topY / HEIGHT_SCALE);
      }
      mesh.setColorAt(tileIndex, color);

      tileIndex++;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
};

export const buildTerrain = (): void => {
  const geometry = new THREE.BoxGeometry(TILE_SIZE, BOX_DEPTH, TILE_SIZE);
  const material = new THREE.MeshPhongMaterial();
  const chunksPerAxis = GRID_SIZE / CHUNK_SIZE;

  for (let chunkZ = 0; chunkZ < chunksPerAxis; chunkZ++) {
    for (let chunkX = 0; chunkX < chunksPerAxis; chunkX++) {
      buildChunk(chunkX, chunkZ, geometry, material);
    }
  }
};
