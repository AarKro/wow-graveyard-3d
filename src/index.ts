import * as THREE from 'three';
import { sizes } from './utils';
import { scene } from './scene';
import { camera, playerPos, updatePlayer } from './player';
import { labelRenderer, updateLabels } from './labels';
import { buildTerrain } from './terrain';
import { buildClouds, updateClouds } from './clouds';
import { buildForest } from './forest';
import { updateSun } from './sun';

const canvas = document.querySelector('canvas.webgl');
if (!canvas) throw new Error('Canvas element not found');

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);

buildTerrain();
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
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
