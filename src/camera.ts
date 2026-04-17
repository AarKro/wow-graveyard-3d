import * as THREE from 'three';
import { sizes } from './utils';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

const cameraControls = new PointerLockControls(camera, document.body);

window.document.body.addEventListener('click', () => {
  cameraControls.lock();
});

const onKeyDown = function (event: KeyboardEvent) {

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
  }

};

const onKeyUp = function (event: KeyboardEvent) {

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

const cameraAnimation = (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {

  const time = performance.now();

  if (cameraControls.isLocked === true) {

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    cameraControls.moveRight(- velocity.x * delta);
    cameraControls.moveForward(- velocity.z * delta);

    cameraControls.object.position.y += (velocity.y * delta); // new behavior

    if (cameraControls.object.position.y < 10) {
      velocity.y = 0;
      cameraControls.object.position.y = 10;
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}


export { camera, cameraControls, cameraAnimation};