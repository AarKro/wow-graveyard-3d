import * as THREE from 'three';
import { SCENE_UTIL, sizes } from './utils';
import { getHeightAt } from './floor';

const cameraDistance_MIN = 10;
const cameraDistance_MAX = 30;

let cameraDistance = 12;
const MOVE_SPEED      = 400;
const GRAVITY         = 300;
const JUMP_IMPULSE    = 80;
const FRICTION        = 20;
const MOUSE_SENS      = 0.002;

// yaw  = horizontal player/camera angle (radians, CCW from -Z)
// pitch = vertical camera elevation angle (radians, up from horizontal)
let yaw   = 0;
let pitch = 0.4;

const playerPos = new THREE.Vector3(0, 30, 0); // start high; gravity drops us onto terrain
const velocity  = new THREE.Vector3();

let moveForward  = false;
let moveBackward = false;
let moveLeft     = false;
let moveRight    = false;
let sprint       = false;
let canJump      = false;
let prevTime     = performance.now();

export const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000);

// --- Pointer lock ---
let isLocked = false;
document.body.addEventListener('click', () => document.body.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === document.body;
});
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isLocked) return;
  yaw   += e.movementX * MOUSE_SENS;
  pitch += e.movementY * MOUSE_SENS;
  pitch  = Math.max(0.05, Math.min(Math.PI / 2.2, pitch));
});
document.addEventListener('wheel', (e: WheelEvent) => {
  cameraDistance += e.deltaY * 0.05;
  cameraDistance = Math.max(cameraDistance_MIN, Math.min(cameraDistance_MAX, cameraDistance));
});

// --- Keys ---
document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': moveForward  = true;  break;
    case 'ArrowDown':  case 'KeyS': moveBackward = true;  break;
    case 'ArrowLeft':  case 'KeyA': moveLeft     = true;  break;
    case 'ArrowRight': case 'KeyD': moveRight    = true;  break;
    case 'ShiftLeft': case 'ShiftRight': sprint = true;  break;
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
    case 'ShiftLeft': case 'ShiftRight': sprint  = false; break;
  }
});

// --- Penguin model (player character) ---
let penguinModel: THREE.Group | null = null;
let penguinFootOffset = 0; // lifts the model so its lowest point sits on the terrain surface
SCENE_UTIL.loadGLTF('src/assets/penguin_club_penguin/scene.gltf', (gltf) => {
  penguinModel = gltf.scene;
  penguinModel.scale.set(0.5, 0.5, 0.5);
  const box = new THREE.Box3().setFromObject(penguinModel);
  penguinFootOffset = -box.min.y;
});

// --- Animation ---
export const cameraAnimation = (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
  const time  = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1); // cap so physics don't explode on tab refocus
  prevTime    = time;

  // Physics always run so the player falls onto the terrain before the mouse is locked
  velocity.x -= velocity.x * FRICTION * delta;
  velocity.z -= velocity.z * FRICTION * delta;
  velocity.y -= GRAVITY * delta;

  if (isLocked) {
    // Resolve WASD into a world-space horizontal direction based on current yaw.
    // Forward = (sin(yaw), 0, -cos(yaw)), Right = (cos(yaw), 0, sin(yaw))
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    let dx = 0, dz = 0;
    if (moveForward)  { dx += sinY; dz -= cosY; }
    if (moveBackward) { dx -= sinY; dz += cosY; }
    if (moveRight)    { dx += cosY; dz += sinY; }
    if (moveLeft)     { dx -= cosY; dz -= sinY; }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      const speed = MOVE_SPEED * (sprint ? 2 : 1);
      velocity.x += (dx / len) * speed * delta;
      velocity.z += (dz / len) * speed * delta;
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

  // Penguin sits at player position, rotated to face the camera's forward direction.
  // rotation.y = PI - yaw maps our yaw convention onto a GLTF model that faces +Z at rest.
  if (penguinModel) {
    penguinModel.position.set(playerPos.x, playerPos.y + penguinFootOffset, playerPos.z);
    penguinModel.rotation.y = Math.PI - yaw;
  }

  // Camera orbits the player: hDist behind, vDist above.
  const hDist = cameraDistance * Math.cos(pitch);
  const vDist = cameraDistance * Math.sin(pitch);
  camera.position.set(
    playerPos.x - Math.sin(yaw) * hDist,
    playerPos.y + vDist,
    playerPos.z + Math.cos(yaw) * hDist,
  );
  camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);

  renderer.render(scene, camera);
};
