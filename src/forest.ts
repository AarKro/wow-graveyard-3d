import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { mulberry32, resolveSeed, getModelUrl } from './utils';
import { scene, loader } from './scene';
import { getHeightAt, WORLD_CHUNK_SIZE } from './floor';
import { colliders } from './colliders';
import config from './data/config.json';

const TREE_INNER_RADIUS = config.forest.trees.innerRadius;
const TREE_OUTER_RADIUS = config.forest.trees.outerRadius;
const TREE_COUNT = config.forest.trees.count;
const TREE_SPACING_INNER = config.forest.trees.spacingInner;
const TREE_SPACING_OUTER = config.forest.trees.spacingOuter;
const TREE_COLLIDER_RADIUS = config.forest.trees.colliderRadius;
const TREE_SCALE_MIN = config.forest.trees.scaleMin;
const TREE_SCALE_MAX = config.forest.trees.scaleMax;

const BUSH_INNER_RADIUS = config.forest.bushes.innerRadius;
const BUSH_OUTER_RADIUS = config.forest.bushes.outerRadius;
const BUSH_COUNT = config.forest.bushes.count;
const BUSH_SPACING_INNER = config.forest.bushes.spacingInner;
const BUSH_SPACING_OUTER = config.forest.bushes.spacingOuter;
const BUSH_SCALE_MIN = config.forest.bushes.scaleMin;
const BUSH_SCALE_MAX = config.forest.bushes.scaleMax;

const CARDINAL_ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

const treeRng = mulberry32(resolveSeed(config.forest.trees.seed));
const bushRng = mulberry32(resolveSeed(config.forest.bushes.seed));

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
  scaleMin: number,
  scaleMax: number,
): Placement[] => {
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const pos = pickInRing(rng, placed, innerR, outerR, innerSpacing, outerSpacing);
    if (!pos) continue;
    placed.push(pos);
    const { x, z } = pos;
    const scale = scaleMin + rng() * (scaleMax - scaleMin);
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
      scene.add(mesh);
    });
  });
};

const loadModels = (urls: string[]): Promise<GLTF[]> =>
  Promise.all(urls.map(url => loader.loadAsync(url)));

export const buildForest = async (): Promise<void> => {
  const [treeGltfs, bushGltfs] = await Promise.all([
    loadModels(config.forest.trees.models.map(getModelUrl)),
    loadModels(config.forest.bushes.models.map(getModelUrl)),
  ]);

  const treePlaced: Array<{ x: number; z: number }> = [];
  const treePlacements = collectPlacements(
    treeGltfs.length, treeRng, treePlaced,
    TREE_COUNT, TREE_INNER_RADIUS, TREE_OUTER_RADIUS,
    TREE_SPACING_INNER, TREE_SPACING_OUTER, TREE_COLLIDER_RADIUS,
    TREE_SCALE_MIN, TREE_SCALE_MAX,
  );
  spawnInstancedMeshes(treeGltfs, treePlacements);

  const bushPlaced: Array<{ x: number; z: number }> = [];
  const bushPlacements = collectPlacements(
    bushGltfs.length, bushRng, bushPlaced,
    BUSH_COUNT, BUSH_INNER_RADIUS, BUSH_OUTER_RADIUS,
    BUSH_SPACING_INNER, BUSH_SPACING_OUTER, 0,
    BUSH_SCALE_MIN, BUSH_SCALE_MAX,
  );
  spawnInstancedMeshes(bushGltfs, bushPlacements);
};
