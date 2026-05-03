import * as THREE from 'three';
import { SCENE_UTIL } from './utils';
import { getHeightAt, TILE_SIZE } from './floor';
import { colliders } from './colliders';
import { addGraveLabel } from './labels';

const GRAVE_RADIUS = 1.0;
const LABEL_TRIGGER = 6;

export const buildGraves = async (): Promise<void> => {
  await SCENE_UTIL.loadGLTF('/src/assets/models/grave/grave.gltf', (gltf) => {
    const x = TILE_SIZE * 7 * -1;
    const z = TILE_SIZE * 3 * -1;
    const y = getHeightAt(x, z);
    gltf.scene.position.set(x, y, z);
    colliders.push({ x, z, radius: GRAVE_RADIUS });
    addGraveLabel(
      {
        name: 'Furyal',
        race: 'Night Elf',
        characterClass: 'Warrior',
        level: 17,
        from: '22.07.2025',
        to: '27.07.2025',
        quote: 'Murlocs...',
      },
      new THREE.Vector3(x, y, z),
      LABEL_TRIGGER,
    );
  });
};
