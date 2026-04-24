import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { SCENE_UTIL, mulberry32 } from './utils';

export const TILE_SIZE = 2;
export const GRID_SIZE = 2000;
export const CHUNK_SIZE = 16; // tiles per chunk side; 2000/16 = 125 chunks per axis
export const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2;

const HEIGHT_SCALE = 10;
const NOISE_SCALE = 0.015;
const BOX_DEPTH = 20;

const SEED = 42;
const noise2D = createNoise2D(mulberry32(SEED));

export const heightMap: number[][] = Array.from({ length: GRID_SIZE }, (_, gz) =>
  Array.from({ length: GRID_SIZE }, (_, gx) => {
    const nx = gx * NOISE_SCALE;
    const nz = gz * NOISE_SCALE;
    const h =
      noise2D(nx,       nz      ) * 0.60 +
      noise2D(nx * 2.1, nz * 2.1) * 0.25 +
      noise2D(nx * 4.7, nz * 4.7) * 0.15;
    const raw = ((h + 1) * 0.5) * HEIGHT_SCALE;
    return Math.round(raw / TILE_SIZE) * TILE_SIZE;
  })
);

export const getHeightAt = (worldX: number, worldZ: number): number => {
  const gx = Math.floor((worldX + HALF_WORLD) / TILE_SIZE);
  const gz = Math.floor((worldZ + HALF_WORLD) / TILE_SIZE);
  const cx = Math.max(0, Math.min(GRID_SIZE - 1, gx));
  const cz = Math.max(0, Math.min(GRID_SIZE - 1, gz));
  return heightMap[cz][cx];
};

const COLOR_LOW  = new THREE.Color(0x2a4d1a);
const COLOR_HIGH = new THREE.Color(0x8fc45a);

const buildChunk = (
  cx: number,
  cz: number,
  geometry: THREE.BoxGeometry,
  material: THREE.MeshPhongMaterial,
): void => {
  const mesh = new THREE.InstancedMesh(geometry, material, CHUNK_SIZE * CHUNK_SIZE);
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const color  = new THREE.Color();
  let idx = 0;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const gx = cx * CHUNK_SIZE + lx;
      const gz = cz * CHUNK_SIZE + lz;
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
  // Computes an accurate bounding sphere from all instance matrices so Three.js
  // can frustum-cull this chunk when it's off-screen.
  mesh.computeBoundingSphere();
  SCENE_UTIL.scene.add(mesh);
};

export const buildFloor = (): void => {
  const geometry = new THREE.BoxGeometry(TILE_SIZE, BOX_DEPTH, TILE_SIZE);
  const material = new THREE.MeshPhongMaterial();
  const chunksPerAxis = GRID_SIZE / CHUNK_SIZE;

  for (let cz = 0; cz < chunksPerAxis; cz++) {
    for (let cx = 0; cx < chunksPerAxis; cx++) {
      buildChunk(cx, cz, geometry, material);
    }
  }
};
