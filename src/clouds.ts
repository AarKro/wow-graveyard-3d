import * as THREE from 'three';
import { SCENE_UTIL, mulberry32 } from './utils';
import { HALF_WORLD } from './floor';

const CLOUD_COUNT  = 150;
const CLOUD_Y      = 250;
const CELL_SIZE    = 30;   // XZ footprint of each cloud voxel
const CELL_HEIGHT  = 8;    // flat, like Minecraft
const DRIFT_SPEED  = 2;    // units/sec — all clouds same speed for Minecraft feel
const WIND_X       = Math.cos(0.2);
const WIND_Z       = Math.sin(0.2);

type CloudEntry = { group: THREE.Group };
const cloudEntries: CloudEntry[] = [];

const makeShape = (w: number, d: number, rng: () => number): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  const hw = (w - 1) * 0.5;
  const hd = (d - 1) * 0.5;
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w; x++) {
      const nx = hw > 0 ? (x - hw) / hw : 0;
      const nz = hd > 0 ? (z - hd) / hd : 0;
      const dist = Math.sqrt(nx * nx + nz * nz);
      const prob = dist < 0.6 ? 1 : Math.max(0, 1 - (dist - 0.6) * 2.0);
      if (rng() < prob)
        cells.push([x - Math.round(hw), z - Math.round(hd)]);
    }
  }
  return cells;
};

export const buildClouds = (): void => {
  const rng = mulberry32(999);
  const geo = new THREE.BoxGeometry(CELL_SIZE, CELL_HEIGHT, CELL_SIZE);
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cx = (rng() * 2 - 1) * HALF_WORLD;
    const cz = (rng() * 2 - 1) * HALF_WORLD;
    const cy = CLOUD_Y + (rng() - 0.5) * 20;
    const w  = 5  + Math.floor(rng() * 10); // 5–14 cells wide
    const d  = 4  + Math.floor(rng() * 7);  // 4–10 cells deep

    const cells = makeShape(w, d, rng);
    if (cells.length === 0) continue;

    const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    mesh.castShadow = true;
    const m = new THREE.Matrix4();
    cells.forEach(([ix, iz], j) => {
      m.setPosition(ix * CELL_SIZE, 0, iz * CELL_SIZE);
      mesh.setMatrixAt(j, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    const group = new THREE.Group();
    group.add(mesh);
    group.position.set(cx, cy, cz);
    SCENE_UTIL.scene.add(group);
    cloudEntries.push({ group });
  }
};

export const updateClouds = (delta: number): void => {
  for (const { group } of cloudEntries) {
    group.position.x += WIND_X * DRIFT_SPEED * delta;
    group.position.z += WIND_Z * DRIFT_SPEED * delta;

    if (group.position.x >  HALF_WORLD) group.position.x -= HALF_WORLD * 2;
    if (group.position.x < -HALF_WORLD) group.position.x += HALF_WORLD * 2;
    if (group.position.z >  HALF_WORLD) group.position.z -= HALF_WORLD * 2;
    if (group.position.z < -HALF_WORLD) group.position.z += HALF_WORLD * 2;
  }
};
