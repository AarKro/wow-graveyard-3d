import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { SCENE_UTIL, mulberry32 } from './utils';
import { TILE_SIZE, HALF_WORLD } from './floor';

const CLOUD_VOXEL_SIZE = TILE_SIZE * 4; // cloud cubes are 4× the terrain tile size

const CLOUD_SEED = 1337;

const CLOUD_COUNT      = 28;
const CLOUD_Y_MIN      = 300;
const CLOUD_Y_MAX      = 450;
const DRIFT_SPEED_MIN  = 1.5; // world units per second
const DRIFT_SPEED_MAX  = 4.0;
const WIND_ANGLE       = Math.PI * 0.2; // shared direction for all clouds (~NNE)

// Radii are halved vs before — each voxel is 2× bigger so overall cloud size stays the same
const RX_MIN = 10; const RX_MAX = 20;
const RY_MIN = 7;  const RY_MAX = 12;
const RZ_MIN = 10; const RZ_MAX = 20;

const BLOB_COUNT      = 6;
const FLAT_BOTTOM     = 0.45;
const CORE_THRESHOLD  = 0.45;
const SHELL_THRESHOLD = 0.72;
const NOISE_FREQ      = 0.18;
const NOISE_AMPLITUDE = 0.30;
const WARP_FREQ       = 0.08;
const WARP_STRENGTH   = 2.5;
const SHELL_OPACITY   = 0.40;

type Blob = { bx: number; by: number; bz: number; brx: number; bry: number; brz: number };
type CloudEntry = { group: THREE.Group; vx: number; vz: number };

const cloudEntries: CloudEntry[] = [];

const buildCloud = (
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
  noise3D: ReturnType<typeof createNoise3D>,
  rng: () => number,
  voxelGeometry: THREE.BoxGeometry,
  coreMaterial: THREE.MeshPhongMaterial,
  shellMaterial: THREE.MeshPhongMaterial,
): THREE.Group => {
  const blobs: Blob[] = [];
  for (let b = 0; b < BLOB_COUNT; b++) {
    blobs.push({
      bx:  (rng() * 2 - 1) * rx * 0.5,
      by:  rng() * ry * 0.5,
      bz:  (rng() * 2 - 1) * rz * 0.5,
      brx: rx * (0.35 + rng() * 0.35),
      bry: ry * (0.45 + rng() * 0.40),
      brz: rz * (0.35 + rng() * 0.35),
    });
  }

  const corePos:  THREE.Vector3[] = [];
  const shellPos: THREE.Vector3[] = [];

  // Instance positions are in LOCAL space (relative to cloud center).
  // The group's world position handles placement — moving the group moves all voxels.
  for (let iz = Math.floor(-rz); iz <= Math.ceil(rz); iz++) {
    for (let iy = Math.floor(-ry); iy <= Math.ceil(ry); iy++) {
      for (let ix = Math.floor(-rx); ix <= Math.ceil(rx); ix++) {
        const warpX = noise3D(ix * WARP_FREQ,        iy * WARP_FREQ, iz * WARP_FREQ + 17.3) * WARP_STRENGTH;
        const warpZ = noise3D(ix * WARP_FREQ + 31.7, iy * WARP_FREQ, iz * WARP_FREQ       ) * WARP_STRENGTH;
        const n     = noise3D((ix + warpX) * NOISE_FREQ, iy * NOISE_FREQ, (iz + warpZ) * NOISE_FREQ);

        let minDist = Infinity;
        for (const { bx, by, bz, brx, bry, brz } of blobs) {
          const lx = ix - bx;
          const ly = iy - by;
          const lz = iz - bz;
          const ryFactor = ly >= 0 ? bry : bry * FLAT_BOTTOM;
          const d = Math.sqrt((lx / brx) ** 2 + (ly / ryFactor) ** 2 + (lz / brz) ** 2);
          if (d < minDist) minDist = d;
        }

        const pd = minDist + n * NOISE_AMPLITUDE;
        const lx = ix * CLOUD_VOXEL_SIZE;
        const ly = iy * CLOUD_VOXEL_SIZE;
        const lz = iz * CLOUD_VOXEL_SIZE;

        if (pd < CORE_THRESHOLD)       corePos.push(new THREE.Vector3(lx, ly, lz));
        else if (pd < SHELL_THRESHOLD) shellPos.push(new THREE.Vector3(lx, ly, lz));
      }
    }
  }

  const group  = new THREE.Group();
  const matrix = new THREE.Matrix4();

  if (corePos.length > 0) {
    const mesh = new THREE.InstancedMesh(voxelGeometry, coreMaterial, corePos.length);
    mesh.castShadow    = true;
    mesh.receiveShadow = false;
    for (let i = 0; i < corePos.length; i++) {
      matrix.setPosition(corePos[i]);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  if (shellPos.length > 0) {
    const mesh = new THREE.InstancedMesh(voxelGeometry, shellMaterial, shellPos.length);
    mesh.castShadow    = false;
    mesh.receiveShadow = false;
    for (let i = 0; i < shellPos.length; i++) {
      matrix.setPosition(shellPos[i]);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  group.position.set(cx, cy, cz);
  return group;
};

export const buildClouds = (): void => {
  const rng     = mulberry32(CLOUD_SEED);
  const noise3D = createNoise3D(mulberry32(CLOUD_SEED + 1));

  const voxelGeometry = new THREE.BoxGeometry(CLOUD_VOXEL_SIZE, CLOUD_VOXEL_SIZE, CLOUD_VOXEL_SIZE);
  const coreMaterial  = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const shellMaterial = new THREE.MeshPhongMaterial({
    color:       0xffffff,
    transparent: true,
    opacity:     SHELL_OPACITY,
    depthWrite:  false,
    side:        THREE.FrontSide,
  });

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cx = (rng() * 2 - 1) * HALF_WORLD;
    const cy = CLOUD_Y_MIN + rng() * (CLOUD_Y_MAX - CLOUD_Y_MIN);
    const cz = (rng() * 2 - 1) * HALF_WORLD;
    const rx = RX_MIN + rng() * (RX_MAX - RX_MIN);
    const ry = RY_MIN + rng() * (RY_MAX - RY_MIN);
    const rz = RZ_MIN + rng() * (RZ_MAX - RZ_MIN);

    // All clouds share the same wind direction; speed varies slightly per cloud
    const speed = DRIFT_SPEED_MIN + rng() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN);

    const group = buildCloud(cx, cy, cz, rx, ry, rz, noise3D, rng, voxelGeometry, coreMaterial, shellMaterial);
    SCENE_UTIL.scene.add(group);
    cloudEntries.push({ group, vx: Math.cos(WIND_ANGLE) * speed, vz: Math.sin(WIND_ANGLE) * speed });
  }
};

export const updateClouds = (delta: number): void => {
  for (const { group, vx, vz } of cloudEntries) {
    group.position.x += vx * delta;
    group.position.z += vz * delta;

    // Wrap around world boundary so clouds never permanently drift away
    if (group.position.x >  HALF_WORLD) group.position.x -= HALF_WORLD * 2;
    if (group.position.x < -HALF_WORLD) group.position.x += HALF_WORLD * 2;
    if (group.position.z >  HALF_WORLD) group.position.z -= HALF_WORLD * 2;
    if (group.position.z < -HALF_WORLD) group.position.z += HALF_WORLD * 2;
  }
};
