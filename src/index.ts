import * as THREE from 'three';
import { sizes, SCENE_UTIL} from './utils';
import { cameraAnimation } from './camera';
import './world.ts';

SCENE_UTIL.scene.background = new THREE.Color(0xaaaaaa);
SCENE_UTIL.scene.fog = new THREE.Fog(0xffffff, 0, 750);

const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
light.position.set(0.5, 1, 0.75);
SCENE_UTIL.scene.add(light);

const canvas = document.querySelector('canvas.webgl');

if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new THREE.WebGLRenderer({
  canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);

renderer.setAnimationLoop(() => cameraAnimation(renderer, SCENE_UTIL.scene));