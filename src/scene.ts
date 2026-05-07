import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import config from './data/config.json';

export const scene = new THREE.Scene();
export const loader = new GLTFLoader();

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2;
skyCanvas.height = 256;
const skyCtx = skyCanvas.getContext('2d')!;
const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 256);
skyGradient.addColorStop(0, config.sky.zenithColor);
skyGradient.addColorStop(1, config.sky.horizonColor);
skyCtx.fillStyle = skyGradient;
skyCtx.fillRect(0, 0, 2, 256);
scene.background = new THREE.CanvasTexture(skyCanvas);

const ambientLight = new THREE.HemisphereLight(
  config.hemisphereLight.skyColor,
  config.hemisphereLight.groundColor,
  config.hemisphereLight.intensity,
);
ambientLight.position.set(0.5, 1, 0.75);
scene.add(ambientLight);
