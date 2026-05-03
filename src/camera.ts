import * as THREE from 'three';
import { sizes } from './utils';
import { getHeightAt } from './floor';
import { colliders } from './colliders';
import { updateLabels } from './labels';
import { updateClouds } from './clouds';
import { updateSun } from './sun';

const EYE_HEIGHT   = 4;
const MOVE_SPEED   = 300;
const GRAVITY      = 150;
const JUMP_IMPULSE = 50;
const FRICTION     = 20;
const MOUSE_SENS   = 0.002;

let yaw   = 0;
let pitch = 0;

const playerPos = new THREE.Vector3(0, 30, 0);
const velocity  = new THREE.Vector3();

let moveForward  = false;
let moveBackward = false;
let moveLeft     = false;
let moveRight    = false;
let canJump      = false;
let prevTime     = performance.now();

export const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000);

let isLocked = false;
document.body.addEventListener('click', () => document.body.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === document.body;
});
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isLocked) return;
  yaw   += e.movementX * MOUSE_SENS;
  pitch += e.movementY * MOUSE_SENS;
  pitch  = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch));
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': moveForward  = true;  break;
    case 'ArrowDown':  case 'KeyS': moveBackward = true;  break;
    case 'ArrowLeft':  case 'KeyA': moveLeft     = true;  break;
    case 'ArrowRight': case 'KeyD': moveRight    = true;  break;
    case 'Space':
      if (canJump) { velocity.y += JUMP_IMPULSE; canJump = false; }
      break;
  }
});
document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': moveForward  = false; break;
    case 'ArrowDown':  case 'KeyS': moveBackward = false; break;
    case 'ArrowLeft':  case 'KeyA': moveLeft     = false; break;
    case 'ArrowRight': case 'KeyD': moveRight    = false; break;
  }
});

export const cameraAnimation = () => {
  const time  = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime    = time;

  velocity.x -= velocity.x * FRICTION * delta;
  velocity.z -= velocity.z * FRICTION * delta;
  velocity.y -= GRAVITY * delta;

  if (isLocked) {
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    let dx = 0, dz = 0;
    if (moveForward)  { dx += sinY; dz -= cosY; }
    if (moveBackward) { dx -= sinY; dz += cosY; }
    if (moveRight)    { dx += cosY; dz += sinY; }
    if (moveLeft)     { dx -= cosY; dz -= sinY; }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      velocity.x += (dx / len) * MOVE_SPEED * delta;
      velocity.z += (dz / len) * MOVE_SPEED * delta;
    }
  }

  playerPos.x += velocity.x * delta;
  playerPos.z += velocity.z * delta;
  playerPos.y += velocity.y * delta;

  const terrainY = getHeightAt(playerPos.x, playerPos.z);
  if (playerPos.y < terrainY) {
    velocity.y  = 0;
    playerPos.y = terrainY;
    canJump     = true;
  }

  for (const c of colliders) {
    const dx = playerPos.x - c.x;
    const dz = playerPos.z - c.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < c.radius * c.radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      playerPos.x = c.x + (dx / dist) * c.radius;
      playerPos.z = c.z + (dz / dist) * c.radius;
    }
  }

  updateClouds(delta);
  updateSun(playerPos);
  updateLabels(playerPos);

  camera.position.set(playerPos.x, playerPos.y + EYE_HEIGHT, playerPos.z);
  camera.lookAt(
    playerPos.x + Math.sin(yaw) * Math.cos(pitch),
    playerPos.y + EYE_HEIGHT   - Math.sin(pitch),
    playerPos.z - Math.cos(yaw) * Math.cos(pitch),
  );
};
