import * as THREE from 'three';
import { SCENE_UTIL } from './utils';

// Direction FROM the world TOWARD the sun (normalized)
export const SUN_DIRECTION = new THREE.Vector3(-2.0, 1.0, 0.3).normalize();

const SUN_DISTANCE = 600; // units from player

// ── Near light — crisp shadows for close objects (gravestones, placed items) ─
export const sunLight = new THREE.DirectionalLight(0xffb347, 2.0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width  = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.bias = -0.0005;
const nearShadowCam = sunLight.shadow.camera;
nearShadowCam.left = nearShadowCam.bottom = -90;
nearShadowCam.right = nearShadowCam.top   =  90;
nearShadowCam.near  = -200;
nearShadowCam.far   =  1500;
nearShadowCam.updateProjectionMatrix();
SCENE_UTIL.scene.add(sunLight);
SCENE_UTIL.scene.add(sunLight.target);

// ── Far light — cloud shadows on terrain ─────────────────────────────────────
const farSunLight = new THREE.DirectionalLight(0xffb347, 0.5);
farSunLight.castShadow = true;
farSunLight.shadow.mapSize.width  = 2048;
farSunLight.shadow.mapSize.height = 2048;
farSunLight.shadow.bias = -0.001;
const farShadowCam = farSunLight.shadow.camera;
farShadowCam.left = farShadowCam.bottom = -700;
farShadowCam.right = farShadowCam.top   =  700;
farShadowCam.near  = -200;
farShadowCam.far   =  1500;
farShadowCam.updateProjectionMatrix();
SCENE_UTIL.scene.add(farSunLight);
SCENE_UTIL.scene.add(farSunLight.target);

// ── Sun visual ───────────────────────────────────────────────────────────────
const coreMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(55, 55),
  new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false }),
);

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
  sunGroup.lookAt(playerPos);

  sunLight.position.copy(sunWorldPos);
  sunLight.target.position.copy(playerPos);
  sunLight.target.updateMatrixWorld();

  farSunLight.position.copy(sunWorldPos);
  farSunLight.target.position.copy(playerPos);
  farSunLight.target.updateMatrixWorld();
};
