import * as THREE from 'three';
import { mulberry32, resolveSeed, getModelUrl } from './utils';
import { scene, loader } from './scene';
import { getHeightAt } from './terrain';
import { isOnPath } from './path';
import config from './data/config.json';

const cfg = config.flowerPatches;
const WORLD_CHUNK_SIZE = config.world.chunkSize * config.terrain.tileSize;

type Placement = { x: number; y: number; z: number; rotation: number; scale: number; variantIdx: number };

export const buildFlowerPatches = async (): Promise<void> => {
  const rng = mulberry32(resolveSeed(cfg.seed));
  const gltfs = await Promise.all(cfg.models.map(m => loader.loadAsync(getModelUrl(m))));

  const variants = gltfs.map(gltf => {
    gltf.scene.updateMatrixWorld(true);
    const source = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    const material = Array.isArray(source.material) ? source.material[0] : source.material;
    return { geometry, material };
  });

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

  // Scatter individual flowers within each patch.
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

  // Group by spatial chunk and variant, then build one InstancedMesh per group.
  const dummy = new THREE.Object3D();
  const chunks = new Map<string, Placement[][]>();
  for (const p of placements) {
    const key = `${Math.floor(p.x / WORLD_CHUNK_SIZE)},${Math.floor(p.z / WORLD_CHUNK_SIZE)}`;
    if (!chunks.has(key)) chunks.set(key, gltfs.map(() => []));
    chunks.get(key)![p.variantIdx].push(p);
  }

  chunks.forEach(variantBatches => {
    variantBatches.forEach((batch, variantIdx) => {
      if (batch.length === 0) return;
      const { geometry, material } = variants[variantIdx];
      const mesh = new THREE.InstancedMesh(geometry, material, batch.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      batch.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotation, 0);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    });
  });
};
