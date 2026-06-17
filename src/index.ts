import * as THREE from 'three';
import { sizes } from './utils';
import { scene } from './scene';
import { camera, playerPos, updatePlayer } from './player';
import { labelRenderer, updateLabels } from './labels';
import { buildTerrain } from './terrain';
import { buildClouds, updateClouds } from './clouds';
import { buildForest } from './forest';
import { updateSun } from './sun';
import { buildComposer } from './godrays';
import { buildGraves } from './graves';
import { buildFlowerPatches } from './flowerPatches';
import { initTouchControls } from './touchControls';

const canvas = document.querySelector('canvas.webgl');
if (!canvas) throw new Error('Canvas element not found');

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);

initTouchControls();

buildTerrain();
buildClouds();
buildForest();
buildGraves();
buildFlowerPatches();

// add godrays (sun rays) post-processing effect after all scene objects are created, so they are included in the depth buffer used for light scattering
const composer = buildComposer(renderer, camera);

// Keep renderer and camera in sync with the window on every resize event.
// renderer.setSize / labelRenderer.setSize only resize the canvas element —
// cheap. composer.setSize reallocates all post-processing GPU render targets
// (depth buffer, godray buffers, etc.) — expensive, so debounce that part only.
// Debouncing everything caused the canvas to hold stale dimensions for 150ms
// and then snap, which itself looked like a jump.
let composerResizeDebounce: ReturnType<typeof setTimeout>;
const onResize = (): void => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  labelRenderer.setSize(sizes.width, sizes.height);

  clearTimeout(composerResizeDebounce);
  composerResizeDebounce = setTimeout(() => {
    composer.setSize(sizes.width, sizes.height);
  }, 150);
};
window.addEventListener('resize', onResize);
// orientationchange fires before the browser has applied the new dimensions,
// so defer one tick to let innerWidth/innerHeight settle first.
window.addEventListener('orientationchange', () => setTimeout(onResize, 100));

let prevTime = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;

  updatePlayer(delta);
  updateClouds(delta);
  updateSun(camera.position);
  updateLabels(playerPos);

  composer.render();
  labelRenderer.render(scene, camera);
});
