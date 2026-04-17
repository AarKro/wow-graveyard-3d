import * as THREE from 'three';
import { cameraAnimation, cameraControls } from './camera';
import { sizes } from './utils';
import { mesh } from './world';

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xffffff );
// scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

scene.add(cameraControls.object);
scene.add(mesh);

const axesHelper = new THREE.AxesHelper(2)
scene.add(axesHelper)

const canvas = document.querySelector('canvas.webgl');

if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);

renderer.setAnimationLoop(() => cameraAnimation(renderer, scene));
