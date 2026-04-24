import * as THREE from 'three';
import { SCENE_UTIL } from './utils';

// Direction FROM the world TOWARD the sun (normalized)
export const SUN_DIRECTION = new THREE.Vector3(2.0, 1.0, -1.0).normalize();

const SUN_DISTANCE  = 600;  // units from player
const SHADOW_RANGE  = 500;  // orthographic shadow camera half-size

// ── Directional light ────────────────────────────────────────────────────────
export const sunLight = new THREE.DirectionalLight(0xfffde7, 1.4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width  = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.radius = 2;
const sc = sunLight.shadow.camera;
sc.left   = -SHADOW_RANGE;
sc.right  =  SHADOW_RANGE;
sc.top    =  SHADOW_RANGE;
sc.bottom = -SHADOW_RANGE;
sc.near   = 1;
sc.far    = 1500;
sc.updateProjectionMatrix();
SCENE_UTIL.scene.add(sunLight);
SCENE_UTIL.scene.add(sunLight.target);

// ── Sun visual ───────────────────────────────────────────────────────────────
// Core: bright white disc
const coreMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(55, 55),
  new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false }),
);

// Halo: larger soft golden ring behind the core
const haloMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(130, 130),
  new THREE.MeshBasicMaterial({ color: 0xffe060, fog: false, transparent: true, opacity: 0.22, depthWrite: false }),
);
haloMesh.position.z = -0.5;

const sunGroup = new THREE.Group();
sunGroup.add(haloMesh);
sunGroup.add(coreMesh);
SCENE_UTIL.scene.add(sunGroup);

// ── Per-frame update ─────────────────────────────────────────────────────────
export const sunWorldPos = new THREE.Vector3();

export const updateSun = (playerPos: THREE.Vector3): void => {
  sunWorldPos.copy(playerPos).addScaledVector(SUN_DIRECTION, SUN_DISTANCE);

  sunGroup.position.copy(sunWorldPos);
  sunGroup.lookAt(playerPos); // face toward the camera

  sunLight.position.copy(sunWorldPos);
  sunLight.target.position.copy(playerPos);
  sunLight.target.updateMatrixWorld();
};
