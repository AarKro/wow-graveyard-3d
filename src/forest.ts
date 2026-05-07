import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { SCENE_UTIL, mulberry32 } from './utils';
import { getHeightAt, WORLD_CHUNK_SIZE } from './floor';
import { colliders } from './colliders';

const TREE_INNER_RADIUS = 100;
const TREE_OUTER_RADIUS = 250;
const TREE_COUNT = 1500;
const TREE_SPACING_INNER = 10;
const TREE_SPACING_OUTER = 4;
const TREE_COLLIDER_RADIUS = 1.5;

const BUSH_INNER_RADIUS = 90;
const BUSH_OUTER_RADIUS = 200;
const BUSH_COUNT = 700;
const BUSH_SPACING_INNER = 6;
const BUSH_SPACING_OUTER = 3;

const CARDINAL_ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

const treeRng = mulberry32(7);
const bushRng = mulberry32(13);

type Placement = { x: number; y: number; z: number; rotation: number; scale: number; variantIdx: number };

// Returns a random (x, z) position within an annular ring. Min spacing shrinks
// linearly from innerSpacing to outerSpacing so density increases with radius.
// Returns null if no valid spot is found within the attempt limit.
const pickInRing = (
  rng: () => number,
  placed: Array<{ x: number; z: number }>,
  innerR: number,
  outerR: number,
  innerSpacing: number,
  outerSpacing: number,
): { x: number; z: number } | null => {
  for (let i = 0; i < 300; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = innerR + rng() * (outerR - innerR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const t = (radius - innerR) / (outerR - innerR);
    const spacing = innerSpacing + (outerSpacing - innerSpacing) * t;
    if (placed.every(p => Math.hypot(p.x - x, p.z - z) >= spacing)) return { x, z };
  }
  return null;
};

// Collects all placement transforms and registers colliders. Keeps RNG calls
// identical to before so the layout is unchanged.
const collectPlacements = (
  variantCount: number,
  rng: () => number,
  placed: Array<{ x: number; z: number }>,
  count: number,
  innerR: number,
  outerR: number,
  innerSpacing: number,
  outerSpacing: number,
  colliderRadius: number,
): Placement[] => {
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const pos = pickInRing(rng, placed, innerR, outerR, innerSpacing, outerSpacing);
    if (!pos) continue;
    placed.push(pos);
    const { x, z } = pos;
    const scale = 0.8 + rng() * 0.4;
    const variantIdx = Math.floor(rng() * variantCount);
    const rotation = CARDINAL_ROTATIONS[Math.floor(rng() * 4)];
    placements.push({ x, y: getHeightAt(x, z), z, rotation, scale, variantIdx });
    if (colliderRadius > 0) colliders.push({ x, z, radius: colliderRadius });
  }
  return placements;
};

// Builds one InstancedMesh per variant per spatial chunk so Three.js can
// frustum-cull chunks behind or beside the player independently.
// Geometry is extracted once per variant and shared across all its chunks.
const spawnInstancedMeshes = (gltfs: GLTF[], placements: Placement[]): void => {
  const dummy = new THREE.Object3D();

  // Extract geometry and material once per variant, baking the centering node transform in.
  const variants = gltfs.map(gltf => {
    gltf.scene.updateMatrixWorld(true);
    const source = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    const material = Array.isArray(source.material) ? source.material[0] : source.material;
    return { geometry, material };
  });

  // Group placements by chunk key and variant index.
  const chunks = new Map<string, Placement[][]>();
  for (const p of placements) {
    const key = `${Math.floor(p.x / WORLD_CHUNK_SIZE)},${Math.floor(p.z / WORLD_CHUNK_SIZE)}`;
    if (!chunks.has(key)) chunks.set(key, gltfs.map(() => []));
    chunks.get(key)![p.variantIdx].push(p);
  }

  // One InstancedMesh per chunk per variant — tight bounding sphere enables per-chunk culling.
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
      SCENE_UTIL.scene.add(mesh);
    });
  });
};

const loadModels = (urls: string[]): Promise<GLTF[]> =>
  Promise.all(urls.map(url => SCENE_UTIL.loader.loadAsync(url)));

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
  const treePlacements = collectPlacements(
    treeGltfs.length, treeRng, treePlaced,
    TREE_COUNT, TREE_INNER_RADIUS, TREE_OUTER_RADIUS,
    TREE_SPACING_INNER, TREE_SPACING_OUTER, TREE_COLLIDER_RADIUS,
  );
  spawnInstancedMeshes(treeGltfs, treePlacements);

  const bushPlaced: Array<{ x: number; z: number }> = [];
  const bushPlacements = collectPlacements(
    bushGltfs.length, bushRng, bushPlaced,
    BUSH_COUNT, BUSH_INNER_RADIUS, BUSH_OUTER_RADIUS,
    BUSH_SPACING_INNER, BUSH_SPACING_OUTER, 0,
  );
  spawnInstancedMeshes(bushGltfs, bushPlacements);
};
