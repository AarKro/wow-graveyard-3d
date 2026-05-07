import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { SCENE_UTIL, mulberry32 } from './utils';

export const TILE_SIZE = 2;
export const GRID_SIZE = 400;
export const CHUNK_SIZE = 16;                       // tiles per chunk side; 400/16 = 25 chunks per axis
export const WORLD_CHUNK_SIZE = CHUNK_SIZE * TILE_SIZE; // 32 world units per chunk
export const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2;

const HEIGHT_SCALE = 10;
const NOISE_SCALE = 0.015;
const BOX_DEPTH = 10;

const SEED = 42;
const noise2D = createNoise2D(mulberry32(SEED));

export const heightMap: number[][] = Array.from({ length: GRID_SIZE }, (_, gridZ) =>
  Array.from({ length: GRID_SIZE }, (_, gridX) => {
    const noiseX = gridX * NOISE_SCALE;
    const noiseZ = gridZ * NOISE_SCALE;
    const noiseValue =
      noise2D(noiseX,       noiseZ      ) * 0.60 +
      noise2D(noiseX * 2.1, noiseZ * 2.1) * 0.25 +
      noise2D(noiseX * 4.7, noiseZ * 4.7) * 0.15;
    const rawHeight = ((noiseValue + 1) * 0.5) * HEIGHT_SCALE;
    return Math.round(rawHeight / TILE_SIZE) * TILE_SIZE;
  })
);

export const getHeightAt = (worldX: number, worldZ: number): number => {
  const gridX = Math.floor((worldX + HALF_WORLD) / TILE_SIZE);
  const gridZ = Math.floor((worldZ + HALF_WORLD) / TILE_SIZE);
  const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
  const clampedZ = Math.max(0, Math.min(GRID_SIZE - 1, gridZ));
  return heightMap[clampedZ][clampedX];
};

const COLOR_LOW = new THREE.Color(0x6b8050);
const COLOR_HIGH = new THREE.Color(0x9eb87a);

const buildChunk = (
  chunkX: number,
  chunkZ: number,
  geometry: THREE.BoxGeometry,
  material: THREE.MeshPhongMaterial,
): void => {
  const mesh = new THREE.InstancedMesh(geometry, material, CHUNK_SIZE * CHUNK_SIZE);
  mesh.receiveShadow = true;

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

      color.lerpColors(COLOR_LOW, COLOR_HIGH, topY / HEIGHT_SCALE);
      mesh.setColorAt(tileIndex, color);

      tileIndex++;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  // Computes an accurate bounding sphere from all instance matrices so Three.js
  // can frustum-cull this chunk when it's off-screen.
  mesh.computeBoundingSphere();
  SCENE_UTIL.scene.add(mesh);
};

export const buildFloor = (): void => {
  const geometry = new THREE.BoxGeometry(TILE_SIZE, BOX_DEPTH, TILE_SIZE);
  const material = new THREE.MeshPhongMaterial();
  const chunksPerAxis = GRID_SIZE / CHUNK_SIZE;

  for (let chunkZ = 0; chunkZ < chunksPerAxis; chunkZ++) {
    for (let chunkX = 0; chunkX < chunksPerAxis; chunkX++) {
      buildChunk(chunkX, chunkZ, geometry, material);
    }
  }
};
