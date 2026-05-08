import * as THREE from 'three';
import { mulberry32, resolveSeed, getModelUrl } from './utils';
import { scene, loader } from './scene';
import { getHeightAt } from './terrain';
import { colliders } from './colliders';
import { addGraveLabel } from './labels';
import config from './data/config.json';

export type GraveData = {
  name: string;
  race: string;
  class: string;
  level: string;
  fromDate: string;
  toDate: string;
  quote: string;
  tombstoneNumber: number;
};

const cfg = config.graves;
const rng = mulberry32(resolveSeed(cfg.seed));

const setShadows = (gltf: { scene: THREE.Object3D }) => {
  gltf.scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
};

export const buildGraves = async (): Promise<void> => {
  const tombstones = cfg.tombstones as GraveData[];
  const cols = cfg.cols;
  const rows = Math.ceil(tombstones.length / cols);

  const [graveGltfs, flowerGltfs] = await Promise.all([
    Promise.all(cfg.models.map(m => loader.loadAsync(getModelUrl(m)))),
    Promise.all(cfg.flowers.models.map(m => loader.loadAsync(getModelUrl(m)))),
  ]);
  graveGltfs.forEach(setShadows);
  flowerGltfs.forEach(setShadows);

  for (let i = 0; i < tombstones.length; i++) {
    const stone = tombstones[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = (col - (cols - 1) / 2) * cfg.colSpacing + (rng() * 2 - 1) * cfg.jitterPos;
    const z = (row - (rows - 1) / 2) * cfg.rowSpacing + (rng() * 2 - 1) * cfg.jitterPos;
    const y = getHeightAt(x, z);

    const graveIndex = stone.tombstoneNumber - 1;
    const grave = graveGltfs[graveIndex].scene.clone(true);
    grave.position.set(x, y, z);
    const baseRot = col === 0 ? Math.PI / 2 : -Math.PI / 2;
    grave.rotation.y = baseRot + (rng() * 2 - 1) * cfg.jitterRot;
    scene.add(grave);

    colliders.push({ x, z, radius: cfg.colliderRadius });
    addGraveLabel(stone, new THREE.Vector3(x, y, z), cfg.labelTriggerRadius);

    for (let f = 0; f < cfg.flowers.perGrave; f++) {
      const angle = rng() * Math.PI * 2;
      const dist = cfg.colliderRadius + rng() * (cfg.flowers.spread - cfg.colliderRadius);
      const fx = x + Math.cos(angle) * dist;
      const fz = z + Math.sin(angle) * dist;
      const fy = getHeightAt(fx, fz);
      const scale = cfg.flowers.scaleMin + rng() * (cfg.flowers.scaleMax - cfg.flowers.scaleMin);
      const modelIndex = Math.floor(rng() * flowerGltfs.length);

      const flower = flowerGltfs[modelIndex].scene.clone(true);
      flower.position.set(fx, fy, fz);
      flower.rotation.y = rng() * Math.PI * 2;
      flower.scale.setScalar(scale);
      scene.add(flower);
    }
  }
};
