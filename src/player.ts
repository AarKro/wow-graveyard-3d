import * as THREE from 'three';
import { sizes } from './utils';
import { getHeightAt } from './terrain';
import { colliders } from './colliders';
import config from './data/config.json';

const EYE_HEIGHT = config.player.eyeHeight;
const MOVE_SPEED = config.player.moveSpeed;
const SPRINT_MULTIPLIER = config.player.sprintMultiplier;
const GRAVITY = config.player.gravity;
const JUMP_IMPULSE = config.player.jumpImpulse;
const FRICTION = config.player.friction;
const MOUSE_SENS = config.player.mouseSensitivity;
const TOUCH_LOOK_SPEED = config.player.touchLookSpeed;

// Touch devices (phones/tablets) get on-screen joysticks instead of
// pointer-lock + mouse look, which they don't meaningfully support.
export const isTouch = window.matchMedia('(pointer: coarse)').matches;

let yaw = 0;
let pitch = 0;

// Start above any terrain — gravity settles the player on the first tick.
export const playerPos = new THREE.Vector3(0, 30, config.path.startZ);
const velocity = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let sprinting = false;
let canJump = false;

// Analog input written by the on-screen joysticks (mobile only).
// Move: x = strafe (right positive), y = forward (up positive).
// Look: per-axis deflection (-1..1) applied as a rotation rate each frame.
const touchMove = { x: 0, y: 0 };
const touchLook = { x: 0, y: 0 };
export const setTouchMove = (x: number, y: number): void => { touchMove.x = x; touchMove.y = y; };
export const setTouchLook = (x: number, y: number): void => { touchLook.x = x; touchLook.y = y; };

export const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000);

// "active" means the player is in control: pointer-locked on desktop, or
// entered via tap on touch devices.
let active = false;
const overlay = document.getElementById('overlay') as HTMLElement;

// Called by the touch controls once the user taps to enter.
export const enterTouch = (): void => {
  active = true;
  overlay.classList.add('hidden');
};

if (!isTouch) {
  document.body.addEventListener('click', () => document.body.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    active = document.pointerLockElement === document.body;
    overlay.classList.toggle('hidden', active);
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!active) return;
    yaw += e.movementX * MOUSE_SENS;
    pitch += e.movementY * MOUSE_SENS;
    pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch));
  });
}

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

export const updatePlayer = (delta: number): void => {
  velocity.x -= velocity.x * FRICTION * delta;
  velocity.z -= velocity.z * FRICTION * delta;
  velocity.y -= GRAVITY * delta;

  if (active) {
    // Right joystick looks around at a rate proportional to its deflection.
    if (isTouch) {
      yaw += touchLook.x * TOUCH_LOOK_SPEED * delta;
      pitch -= touchLook.y * TOUCH_LOOK_SPEED * delta;
      pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch));
    }

    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    // Resolve forward/strafe intent (digital on desktop, analog on touch).
    let forward = 0, strafe = 0, speedScale = 1;
    if (isTouch) {
      forward = touchMove.y;
      strafe = touchMove.x;
    } else {
      if (moveForward)  forward += 1;
      if (moveBackward) forward -= 1;
      if (moveRight)    strafe += 1;
      if (moveLeft)     strafe -= 1;
      if (sprinting)    speedScale = SPRINT_MULTIPLIER;
    }

    const dirX = sinYaw * forward + cosYaw * strafe;
    const dirZ = -cosYaw * forward + sinYaw * strafe;
    const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (dirLength > 0) {
      // On touch, scale speed by joystick magnitude (clamped) for analog walking.
      const magnitude = isTouch ? Math.min(1, Math.sqrt(forward * forward + strafe * strafe)) : 1;
      const speed = MOVE_SPEED * speedScale * magnitude;
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

  camera.position.set(playerPos.x, playerPos.y + EYE_HEIGHT, playerPos.z);
  camera.lookAt(
    playerPos.x + Math.sin(yaw) * Math.cos(pitch),
    playerPos.y + EYE_HEIGHT - Math.sin(pitch),
    playerPos.z - Math.cos(yaw) * Math.cos(pitch),
  );
};
