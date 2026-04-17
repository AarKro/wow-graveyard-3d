import * as THREE from 'three';
import { SCENE_UTIL } from './utils';

let floorGeometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
floorGeometry.rotateX( - Math.PI / 2 );
const floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: true } );
export const floor = new THREE.Mesh( floorGeometry, floorMaterial );
SCENE_UTIL.scene.add(floor);

export const penguinPromise = SCENE_UTIL.loadGLTF('src/assets/penguin_club_penguin/scene.gltf', (gltf) => {
  gltf.scene.position.set(0, 5, 0);
});