import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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