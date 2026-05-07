import * as THREE from 'three';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { SCENE_UTIL, mulberry32 } from './utils';
import { getHeightAt } from './floor';
import { colliders } from './colliders';

const TREE_INNER_RADIUS = 60;
const TREE_OUTER_RADIUS = 150;
const TREE_COUNT = 350;
const TREE_MIN_SPACING = 6;
const TREE_COLLIDER_RADIUS = 1.5;

const BUSH_INNER_RADIUS = 50;
const BUSH_OUTER_RADIUS = 150;
const BUSH_COUNT = 200;
const BUSH_MIN_SPACING = 4;

const CARDINAL_ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

const treeRng = mulberry32(7);
const bushRng = mulberry32(13);

// Returns a random (x, z) position within an annular ring that is at least
// minSpacing away from all already-placed positions. Returns null if no valid
// spot is found within the attempt limit.
const pickInRing = (
  rng: () => number,
  placed: Array<{ x: number; z: number }>,
  innerR: number,
  outerR: number,
  minSpacing: number,
): { x: number; z: number } | null => {
  for (let i = 0; i < 300; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = innerR + rng() * (outerR - innerR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (placed.every(p => Math.hypot(p.x - x, p.z - z) >= minSpacing)) return { x, z };
  }
  return null;
};

// Spawns count objects into the scene by picking positions in a ring, then
// cloning a random model variant at each spot with randomised scale and rotation.
// Optionally registers a circular collider per object for player collision.
const placeInstances = (
  gltfs: GLTF[],
  rng: () => number,
  placed: Array<{ x: number; z: number }>,
  count: number,
  innerR: number,
  outerR: number,
  minSpacing: number,
  addCollider: boolean,
  colliderRadius: number,
): void => {
  for (let i = 0; i < count; i++) {
    const pos = pickInRing(rng, placed, innerR, outerR, minSpacing);
    if (!pos) continue;
    placed.push(pos);

    const { x, z } = pos;
    const y = getHeightAt(x, z);
    const model = gltfs[Math.floor(rng() * gltfs.length)].scene.clone(true);
    model.position.set(x, y, z);
    model.rotation.y = CARDINAL_ROTATIONS[Math.floor(rng() * 4)];
    model.scale.setScalar(0.8 + rng() * 0.4);
    SCENE_UTIL.scene.add(model);

    if (addCollider) colliders.push({ x, z, radius: colliderRadius });
  }
};

const loadModels = (urls: string[]): Promise<GLTF[]> =>
  Promise.all(
    urls.map(url =>
      SCENE_UTIL.loader.loadAsync(url).then(gltf => {
        gltf.scene.traverse(node => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        return gltf;
      })
    )
  );

export const buildForest = async (): Promise<void> => {
  const [treeGltfs, bushGltfs] = await Promise.all([
    loadModels([
      new URL('./assets/models/tree_1.gltf', import.meta.url).href,
      new URL('./assets/models/tree_2.gltf', import.meta.url).href,
      new URL('./assets/models/tree_3.gltf', import.meta.url).href,
    ]),
    loadModels([
      new URL('./assets/models/bush_1.gltf', import.meta.url).href,
      new URL('./assets/models/bush_2.gltf', import.meta.url).href,
      new URL('./assets/models/bush_3.gltf', import.meta.url).href,
    ]),
  ]);

  const treePlaced: Array<{ x: number; z: number }> = [];
  placeInstances(treeGltfs, treeRng, treePlaced, TREE_COUNT, TREE_INNER_RADIUS, TREE_OUTER_RADIUS, TREE_MIN_SPACING, true, TREE_COLLIDER_RADIUS);

  const bushPlaced: Array<{ x: number; z: number }> = [];
  placeInstances(bushGltfs, bushRng, bushPlaced, BUSH_COUNT, BUSH_INNER_RADIUS, BUSH_OUTER_RADIUS, BUSH_MIN_SPACING, false, 0);
};
