import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import config from './data/config.json';

export const scene = new THREE.Scene();
export const loader = new GLTFLoader();

scene.background = new THREE.Color(config.sky.backgroundColor);

const ambientLight = new THREE.HemisphereLight(
  config.hemisphereLight.skyColor,
  config.hemisphereLight.groundColor,
  config.hemisphereLight.intensity,
);
ambientLight.position.set(0.5, 1, 0.75);
scene.add(ambientLight);
