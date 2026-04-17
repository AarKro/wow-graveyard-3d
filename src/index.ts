import * as THREE from 'three';
import { camera } from './camera';
import { sizes } from './utils';
import { mesh } from './world';

const scene = new THREE.Scene();

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

renderer.render(scene, camera);