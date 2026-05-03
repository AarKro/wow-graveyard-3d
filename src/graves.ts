import { SCENE_UTIL } from './utils';
import { getHeightAt, TILE_SIZE } from './floor';
import { colliders } from './colliders';

const GRAVE_RADIUS = 1.0;

export const buildGraves = async (): Promise<void> => {
  await SCENE_UTIL.loadGLTF('/src/assets/grave/grave.gltf', (gltf) => {
    const x = TILE_SIZE * 7 * -1;
    const z = TILE_SIZE * 3 * -1;
    gltf.scene.position.set(x, getHeightAt(x, z), z);
    colliders.push({ x, z, radius: GRAVE_RADIUS });
  });
};
