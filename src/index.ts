import * as THREE from 'three';
import { sizes, SCENE_UTIL} from './utils';
import { camera, updatePlayer } from './player';
import { sunWorldPos } from './sun';
import { initComposer, renderGodRays } from './god-rays';
import { labelRenderer } from './labels';
import './world.ts';

SCENE_UTIL.scene.background = new THREE.Color(0xdce8f0);
SCENE_UTIL.scene.fog = new THREE.FogExp2(0xdce8f0, 0.0010);

const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
light.position.set(0.5, 1, 0.75);
SCENE_UTIL.scene.add(light);

const canvas = document.querySelector('canvas.webgl');
if (!canvas) throw new Error("Canvas element not found");

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);

const { composer, godRaysPass } = initComposer(renderer, SCENE_UTIL.scene, camera);

renderer.setAnimationLoop(() => {
  updatePlayer();
  //renderGodRays(renderer, sunWorldPos, camera, godRaysPass);
  composer.render();
  labelRenderer.render(SCENE_UTIL.scene, camera);
});
