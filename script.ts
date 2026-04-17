import * as THREE from 'three';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

console.log(THREE);

// Scene
const scene = new THREE.Scene();

// Object
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

mesh.position.x = 0.7
mesh.position.y = - 0.6
mesh.position.z = 1

mesh.scale.x = 2
mesh.scale.y = 0.25
mesh.scale.z = 0.5

mesh.rotation.x = Math.PI * 0.25
mesh.rotation.y = Math.PI * 0.25

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

type CameraMoveKey = 'w' | 'a' | 's' | 'd';

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 3;

const controls = new FirstPersonControls( camera );

scene.add(camera);

// Canvas
const canvas = document.querySelector('canvas.webgl');

if (!canvas) {
  throw new Error("Canvas element not found");
}

/**
 * Axes Helper
 */
const axesHelper = new THREE.AxesHelper(2)
scene.add(axesHelper)

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);

renderer.render(scene, camera);

let cameraMoveAnimationIds: Record<CameraMoveKey, number | null> = {
  w: null,
  a: null,
  s: null,
  d: null,
};

window.addEventListener('keydown', (event) => {
  if (event.key === 'w' && cameraMoveAnimationIds['w'] === null) {
    moveCamera('z', -0.1, 'w');
  } else if (event.key === 's' && cameraMoveAnimationIds['s'] === null) {
    moveCamera('z', 0.1, 's');
  } else if (event.key === 'a' && cameraMoveAnimationIds['a'] === null) {
    moveCamera('x', -0.1, 'a');
  } else if (event.key === 'd' && cameraMoveAnimationIds['d'] === null) {
    moveCamera('x', 0.1, 'd');
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'w') {
    cancelCameraMoveAnimation('w');
  } else if (event.key === 's') {
    cancelCameraMoveAnimation('s');
  } else if (event.key === 'a') {
    cancelCameraMoveAnimation('a');
  } else if (event.key === 'd') {
    cancelCameraMoveAnimation('d');
  }
});

const cancelCameraMoveAnimation = (key: CameraMoveKey) => {
  if (cameraMoveAnimationIds[key] !== null) {
    window.cancelAnimationFrame(cameraMoveAnimationIds[key]!);
    cameraMoveAnimationIds[key] = null;
  }
};

const moveCamera = (axis: 'x' | 'y' | 'z', distance: number, key: CameraMoveKey) => {
  if (axis === 'x') {
    camera.position.x += distance;
  } else if (axis === 'y') {
    camera.position.y += distance;
  } else if (axis === 'z') {
    camera.position.z += distance;
  }

  renderer.render(scene, camera);

  cameraMoveAnimationIds[key] = window.requestAnimationFrame(() => moveCamera(axis, distance, key));
};
