import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

export const SCENE_UTIL = {
  loader: new GLTFLoader(),
  scene: new THREE.Scene(),
};