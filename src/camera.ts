import * as THREE from 'three';
import { SCENE_UTIL, sizes } from './utils';
import { getHeightAt } from './floor';
import { updateClouds } from './clouds';
import { updateSun } from './sun';

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
  pitch  = Math.max(-Math.PI * 0.45, Math.min(Math.PI / 2.2, pitch));
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
let penguinFootOffset = 0;
let penguinMaterials: THREE.Material[] = [];
let mixer: THREE.AnimationMixer | null = null;
let idleAction: THREE.AnimationAction | null = null;
let walkAction: THREE.AnimationAction | null = null;
let isMoving = false;

SCENE_UTIL.loadGLTF('src/assets/penguin_club_penguin/scene.gltf', (gltf) => {
  penguinModel = gltf.scene;
  penguinModel.scale.set(0.5, 0.5, 0.5);
  const box = new THREE.Box3().setFromObject(penguinModel);
  penguinFootOffset = -box.min.y;

  // Cache materials and pre-enable transparency so we can fade when camera is close
  penguinModel.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mats = Array.isArray((node as THREE.Mesh).material)
        ? (node as THREE.Mesh).material as THREE.Material[]
        : [(node as THREE.Mesh).material as THREE.Material];
      for (const mat of mats) {
        mat.transparent = true;
        penguinMaterials.push(mat);
      }
    }
  });

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(penguinModel);
    const find = (name: string) => gltf.animations.find(a => a.name.toLowerCase().includes(name));
    const idleClip = find('idle') ?? gltf.animations[0];
    const walkClip = find('walk') ?? find('run') ?? gltf.animations[1] ?? gltf.animations[0];
    idleAction = mixer.clipAction(idleClip);
    walkAction = mixer.clipAction(walkClip);
    idleAction.play();
  }
});

// --- Animation ---
export const cameraAnimation = () => {
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

  // Crossfade between idle and walk animations based on horizontal movement.
  const moving = moveForward || moveBackward || moveLeft || moveRight;
  if (mixer) {
    mixer.update(delta);
    if (moving !== isMoving) {
      isMoving = moving;
      const from = isMoving ? idleAction : walkAction;
      const to   = isMoving ? walkAction : idleAction;
      if (from && to) {
        to.reset().fadeIn(0.2);
        from.fadeOut(0.2);
      }
    }
  }

  updateClouds(delta);
  updateSun(playerPos);

  // Camera orbits the player: hDist behind, vDist above.
  const hDist = cameraDistance * Math.cos(pitch);
  const vDist = cameraDistance * Math.sin(pitch);
  camera.position.set(
    playerPos.x - Math.sin(yaw) * hDist,
    playerPos.y + vDist,
    playerPos.z + Math.cos(yaw) * hDist,
  );

  // Prevent camera from clipping into terrain when pitched low
  const camGroundY = getHeightAt(camera.position.x, camera.position.z);
  if (camera.position.y < camGroundY + 0.5) camera.position.y = camGroundY + 0.5;

  camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);

  // Fade penguin out when camera gets close (e.g. when pitched down and zoomed in)
  if (penguinMaterials.length > 0) {
    const effectiveDist = camera.position.distanceTo(playerPos);
    const opacity = Math.max(0, Math.min(1, (effectiveDist - 2) / 4));
    for (const mat of penguinMaterials) mat.opacity = opacity;
  }

  // Penguin sits at player position, rotated to face the camera's forward direction.
  // rotation.y = PI - yaw maps our yaw convention onto a GLTF model that faces +Z at rest.
  if (penguinModel) {
    penguinModel.position.set(playerPos.x, playerPos.y + penguinFootOffset, playerPos.z);
    penguinModel.rotation.y = Math.PI - yaw;
  }

};
