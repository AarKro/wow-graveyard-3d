import * as THREE from 'three';
import { SCENE_UTIL, mulberry32 } from './utils';
import { getHeightAt } from './floor';
import { colliders } from './colliders';
import { addGraveLabel } from './labels';
import tombstones from './data/tombstones.json';

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

const GRAVE_RADIUS = 1.0;
const LABEL_TRIGGER = 6;
const SPREAD = 40;
const MIN_SPACING = 6;

const rng = mulberry32(42);

const pickPosition = (placed: Array<{ x: number; z: number }>): { x: number; z: number } => {
  for (let i = 0; i < 200; i++) {
    const x = (rng() * 2 - 1) * SPREAD;
    const z = (rng() * 2 - 1) * SPREAD;
    if (placed.every(existing => Math.hypot(existing.x - x, existing.z - z) >= MIN_SPACING)) return { x, z };
  }
  return { x: (rng() * 2 - 1) * SPREAD, z: (rng() * 2 - 1) * SPREAD };
};

export const buildGraves = async (): Promise<void> => {
  const gltf = await SCENE_UTIL.loader.loadAsync('/src/assets/models/grave/grave.gltf');

  gltf.scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      node.castShadow = true;
    }
  });

  const placed: Array<{ x: number; z: number }> = [];

  for (const stone of tombstones as GraveData[]) {
    const { x, z } = pickPosition(placed);
    placed.push({ x, z });
    const y = getHeightAt(x, z);

    const grave = gltf.scene.clone(true);
    grave.position.set(x, y, z);
    grave.rotation.y = rng() * Math.PI * 2;
    SCENE_UTIL.scene.add(grave);

    colliders.push({ x, z, radius: GRAVE_RADIUS });
    addGraveLabel(stone, new THREE.Vector3(x, y, z), LABEL_TRIGGER);
  }
};
