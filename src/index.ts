import * as THREE from 'three';
import { sizes, SCENE_UTIL} from './utils';
import { cameraAnimation } from './camera';
import './world.ts';

SCENE_UTIL.scene.background = new THREE.Color(0xdce8f0);
SCENE_UTIL.scene.fog = new THREE.FogExp2(0xdce8f0, 0.0010);

const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
light.position.set(0.5, 1, 0.75);
SCENE_UTIL.scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 2;
directionalLight.position.set(100, 100, 100);
SCENE_UTIL.scene.add(directionalLight);

const canvas = document.querySelector('canvas.webgl');

if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setAnimationLoop(() => cameraAnimation(renderer, SCENE_UTIL.scene));