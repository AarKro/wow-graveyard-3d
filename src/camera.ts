import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SCENE_UTIL } from './utils';

const CAMERA_DEFAULT_Y = 2;

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
cameraControls.object.position.set(0, CAMERA_DEFAULT_Y, 10);
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
      if (canJump === true) velocity.y += 150;
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

    velocity.y -= 4 * 100.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    cameraControls.moveRight(- velocity.x * delta);
    cameraControls.moveForward(- velocity.z * delta);

    cameraControls.object.position.y += (velocity.y * delta);

    if (cameraControls.object.position.y < CAMERA_DEFAULT_Y)  {
      velocity.y = 0;
      cameraControls.object.position.y = CAMERA_DEFAULT_Y;
      canJump = true;
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
};