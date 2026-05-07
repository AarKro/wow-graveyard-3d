import * as THREE from 'three';
import { SCENE_UTIL, mulberry32 } from './utils';

const CLOUD_COUNT = 150;
const CLOUD_SPREAD = 2000; // wrap boundary — matches camera far plane so clouds are clipped before they wrap
const CLOUD_Y = 250;
const CELL_SIZE = 30;   // XZ footprint of each cloud voxel
const CELL_HEIGHT = 8;  // flat, like Minecraft
const DRIFT_SPEED = 2;  // units/sec — all clouds move at the same speed for a Minecraft feel
const WIND_X = Math.cos(0.2);
const WIND_Z = Math.sin(0.2);

type CloudEntry = { group: THREE.Group };
const cloudEntries: CloudEntry[] = [];

const makeShape = (width: number, depth: number, rng: () => number): Array<[number, number]> => {
  const cells = new Array<[number, number]>();
  const halfWidth = (width - 1) * 0.5;
  const halfDepth = (depth - 1) * 0.5;

  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const normalizedX = halfWidth > 0 ? (x - halfWidth) / halfWidth : 0;
      const normalizedZ = halfDepth > 0 ? (z - halfDepth) / halfDepth : 0;
      const dist = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
      // Solid core within radius 0.6; soft falloff toward edges for a natural shape
      const prob = dist < 0.6 ? 1 : Math.max(0, 1 - (dist - 0.6) * 2.0);
      if (rng() < prob)
        cells.push([x - Math.round(halfWidth), z - Math.round(halfDepth)]);
    }
  }
  return cells;
};

export const buildClouds = (): void => {
  const rng = mulberry32(999);
  const geo = new THREE.BoxGeometry(CELL_SIZE, CELL_HEIGHT, CELL_SIZE);
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloudX = (rng() * 2 - 1) * CLOUD_SPREAD;
    const cloudZ = (rng() * 2 - 1) * CLOUD_SPREAD;
    const cloudY = CLOUD_Y + (rng() - 0.5) * 20;
    const width = 5 + Math.floor(rng() * 10); // 5–14 cells wide
    const depth = 4 + Math.floor(rng() * 7);  // 4–10 cells deep

    const cells = makeShape(width, depth, rng);
    if (cells.length === 0) continue;

    const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    mesh.castShadow = true;

    const matrix = new THREE.Matrix4();
    cells.forEach(([cellX, cellZ], index) => {
      matrix.setPosition(cellX * CELL_SIZE, 0, cellZ * CELL_SIZE);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    const group = new THREE.Group();
    group.add(mesh);
    group.position.set(cloudX, cloudY, cloudZ);
    SCENE_UTIL.scene.add(group);
    cloudEntries.push({ group });
  }
};

export const updateClouds = (delta: number, playerPos: THREE.Vector3): void => {
  const span = CLOUD_SPREAD * 2;
  for (const { group } of cloudEntries) {
    group.position.x += WIND_X * DRIFT_SPEED * delta;
    group.position.z += WIND_Z * DRIFT_SPEED * delta;

    if (group.position.x > playerPos.x + CLOUD_SPREAD) group.position.x -= span;
    if (group.position.x < playerPos.x - CLOUD_SPREAD) group.position.x += span;
    if (group.position.z > playerPos.z + CLOUD_SPREAD) group.position.z -= span;
    if (group.position.z < playerPos.z - CLOUD_SPREAD) group.position.z += span;
  }
};
