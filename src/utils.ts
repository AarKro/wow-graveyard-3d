import config from './data/config.json';

const modelGlob = import.meta.glob('./assets/models/*.gltf', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const getModelUrl = (filename: string): string => {
  const url = modelGlob[`./assets/models/${filename}`];
  if (!url) throw new Error(`Model not found: ${filename}`);
  return url;
};

// Returns world.seed if set (non-zero), otherwise the module-specific seed.
export const resolveSeed = (individual: number): number =>
  individual !== 0 ? individual : config.world.seed;

// Algorithm for generating deterministic random numbers from a seed.
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
