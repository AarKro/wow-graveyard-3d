import * as THREE from 'three';
import { sizes, SCENE_UTIL } from './utils';
import { camera, playerPos, updatePlayer } from './player';
import { labelRenderer } from './labels';
import { updateLabels } from './labels';
import { buildFloor } from './floor';
import { buildClouds, updateClouds } from './clouds';
import { buildForest } from './forest';
import { updateSun } from './sun';
import config from './data/config.json';

SCENE_UTIL.scene.background = new THREE.Color(config.sky.color);
SCENE_UTIL.scene.fog = new THREE.FogExp2(config.sky.color, config.sky.fogDensity);

const light = new THREE.HemisphereLight(config.ambient.skyColor, config.ambient.groundColor, config.ambient.intensity);
light.position.set(0.5, 1, 0.75);
SCENE_UTIL.scene.add(light);

const canvas = document.querySelector('canvas.webgl');
if (!canvas) throw new Error('Canvas element not found');

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);

buildFloor();
buildClouds();
buildForest();

let prevTime = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;
  updatePlayer(delta);
  updateClouds(delta);
  updateSun(camera.position);
  updateLabels(playerPos);
  renderer.render(SCENE_UTIL.scene, camera);
  labelRenderer.render(SCENE_UTIL.scene, camera);
});
