import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const mulberry32 = (s: number) => () => {
  s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

export const SCENE_UTIL = {
  loader: new GLTFLoader(),
  scene: new THREE.Scene(),
  loadGLTF: async (path: string, cb: (gltf: GLTF) => void) => {
    const gltf = await SCENE_UTIL.loader.loadAsync(path);
    
    gltf.scene.traverse((node) => {
      if (node.castShadow !== undefined) { 
        node.castShadow = true; 
      }
    });

    cb(gltf);
    
    SCENE_UTIL.scene.add(gltf.scene);    
  }
};