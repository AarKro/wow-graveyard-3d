import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import config from './data/config.json';

const modelGlob = import.meta.glob('./assets/models/*.gltf', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const getModelUrl = (filename: string): string => {
  const url = modelGlob[`./assets/models/${filename}`];
  if (!url) throw new Error(`Model not found: ${filename}`);
  return url;
};

// Returns world.seed if set (non-zero), otherwise the module-specific seed.
export const resolveSeed = (individual: number): number => {
  if (config.world.forceWorldSeed) return config.world.seed;
  return individual !== 0 ? individual : config.world.seed;
};

// Mulberry32: fast, seedable 32-bit pseudo-random number generator.
// https://github.com/cprosche/mulberry32
export const mulberry32 = (s: number) => () => {
  s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Extracts the first mesh from a GLTF scene, baking its world transform into
// the geometry so it can be used directly in an InstancedMesh.
export const extractMesh = (gltf: GLTF): { geometry: THREE.BufferGeometry; material: THREE.Material } => {
  gltf.scene.updateMatrixWorld(true);
  const source = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
  const geometry = source.geometry.clone();
  geometry.applyMatrix4(source.matrixWorld);
  const material = Array.isArray(source.material) ? source.material[0] : source.material;
  return { geometry, material };
};
