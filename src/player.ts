import * as THREE from 'three';
import { sizes } from './utils';
import { getHeightAt } from './floor';
import { colliders } from './colliders';
import { updateLabels } from './labels';
import { updateClouds } from './clouds';
import { updateSun } from './sun';

const EYE_HEIGHT = 4;
const MOVE_SPEED = 300;
const GRAVITY = 150;
const JUMP_IMPULSE = 50;
const FRICTION = 20;
const MOUSE_SENS = 0.002;

let yaw = 0;
let pitch = 0;

const playerPos = new THREE.Vector3(0, 30, 0);
const velocity = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let sprinting = false;
let canJump = false;
let prevTime = performance.now();

export const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000);

let isLocked = false;
document.body.addEventListener('click', () => document.body.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === document.body;
});
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isLocked) return;
  yaw += e.movementX * MOUSE_SENS;
  pitch += e.movementY * MOUSE_SENS;
  pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch));
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': moveForward = true;  break;
    case 'ArrowDown':  case 'KeyS': moveBackward = true; break;
    case 'ArrowLeft':  case 'KeyA': moveLeft = true;     break;
    case 'ArrowRight': case 'KeyD': moveRight = true;    break;
    case 'ShiftLeft':  case 'ShiftRight': sprinting = true; break;
    case 'Space':
      if (canJump) { velocity.y += JUMP_IMPULSE; canJump = false; }
      break;
  }
});
document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': moveForward = false;  break;
    case 'ArrowDown':  case 'KeyS': moveBackward = false; break;
    case 'ArrowLeft':  case 'KeyA': moveLeft = false;     break;
    case 'ArrowRight': case 'KeyD': moveRight = false;    break;
    case 'ShiftLeft':  case 'ShiftRight': sprinting = false; break;
  }
});

export const updatePlayer = () => {
  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;

  velocity.x -= velocity.x * FRICTION * delta;
  velocity.z -= velocity.z * FRICTION * delta;
  velocity.y -= GRAVITY * delta;

  if (isLocked) {
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    let dirX = 0, dirZ = 0;
    if (moveForward)  { dirX += sinYaw; dirZ -= cosYaw; }
    if (moveBackward) { dirX -= sinYaw; dirZ += cosYaw; }
    if (moveRight)    { dirX += cosYaw; dirZ += sinYaw; }
    if (moveLeft)     { dirX -= cosYaw; dirZ -= sinYaw; }
    const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (dirLength > 0) {
      const speed = MOVE_SPEED * (sprinting ? 1.5 : 1);
      velocity.x += (dirX / dirLength) * speed * delta;
      velocity.z += (dirZ / dirLength) * speed * delta;
    }
  }

  playerPos.x += velocity.x * delta;
  playerPos.z += velocity.z * delta;
  playerPos.y += velocity.y * delta;

  const terrainY = getHeightAt(playerPos.x, playerPos.z);
  if (playerPos.y < terrainY) {
    velocity.y = 0;
    playerPos.y = terrainY;
    canJump = true;
  }

  for (const collider of colliders) {
    const offsetX = playerPos.x - collider.x;
    const offsetZ = playerPos.z - collider.z;
    const distSq = offsetX * offsetX + offsetZ * offsetZ;
    if (distSq < collider.radius * collider.radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      playerPos.x = collider.x + (offsetX / dist) * collider.radius;
      playerPos.z = collider.z + (offsetZ / dist) * collider.radius;
    }
  }

  updateClouds(delta, playerPos);
  updateSun(playerPos);
  updateLabels(playerPos);

  camera.position.set(playerPos.x, playerPos.y + EYE_HEIGHT, playerPos.z);
  camera.lookAt(
    playerPos.x + Math.sin(yaw) * Math.cos(pitch),
    playerPos.y + EYE_HEIGHT - Math.sin(pitch),
    playerPos.z - Math.cos(yaw) * Math.cos(pitch),
  );
};
