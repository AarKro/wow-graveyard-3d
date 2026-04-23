import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SCENE_UTIL } from './utils';
import { getHeightAt } from './floor';

const CAMERA_EYE_HEIGHT = 2; // units above terrain surface

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

const cameraControls = new PointerLockControls(camera, document.body);
// Start high enough to always be above terrain; gravity will drop us onto it
cameraControls.object.position.set(0, 30, 10);
SCENE_UTIL.scene.add(cameraControls.object);

window.document.body.addEventListener('click', () => {
  cameraControls.lock();
});

const onKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (canJump === true) velocity.y += 80;
      canJump = false;
      break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

export const cameraAnimation = (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
  const time = performance.now();

  if (cameraControls.isLocked === true) {
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 20.0 * delta;
    velocity.z -= velocity.z * 20.0 * delta;

    velocity.y -= 3 * 100.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    cameraControls.moveRight(- velocity.x * delta);
    cameraControls.moveForward(- velocity.z * delta);

    cameraControls.object.position.y += (velocity.y * delta);

    const terrainY = getHeightAt(
      cameraControls.object.position.x,
      cameraControls.object.position.z
    );
    const floorY = terrainY + CAMERA_EYE_HEIGHT;

    if (cameraControls.object.position.y < floorY) {
      velocity.y = 0;
      cameraControls.object.position.y = floorY;
      canJump = true;
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
};