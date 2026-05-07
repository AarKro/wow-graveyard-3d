import * as THREE from 'three';
import { scene } from './scene';
import config from './data/config.json';

const SUN_DISTANCE = config.sun.distance;
const SHADOW_CAM_NEAR = config.sun.shadowCameraNear;
const SHADOW_CAM_FAR = config.sun.shadowCameraFar;
const nearCfg = config.sun.nearLight;
const farCfg = config.sun.farLight;
const coreCfg = config.sun.core;
const haloCfg = config.sun.halo;

// Direction FROM the world TOWARD the sun (normalized)
export const SUN_DIRECTION = new THREE.Vector3(
  config.sun.direction[0], config.sun.direction[1], config.sun.direction[2],
).normalize();

export const sunLight = new THREE.DirectionalLight(nearCfg.color, nearCfg.intensity);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = nearCfg.shadowMapSize;
sunLight.shadow.mapSize.height = nearCfg.shadowMapSize;
sunLight.shadow.bias = nearCfg.shadowBias;
const nearShadowCam = sunLight.shadow.camera;
nearShadowCam.left = nearShadowCam.bottom = -nearCfg.shadowCameraSize;
nearShadowCam.right = nearShadowCam.top = nearCfg.shadowCameraSize;
nearShadowCam.near = SHADOW_CAM_NEAR;
nearShadowCam.far = SHADOW_CAM_FAR;
nearShadowCam.updateProjectionMatrix();
scene.add(sunLight);
scene.add(sunLight.target);

const farSunLight = new THREE.DirectionalLight(farCfg.color, farCfg.intensity);
farSunLight.castShadow = true;
farSunLight.shadow.mapSize.width = farCfg.shadowMapSize;
farSunLight.shadow.mapSize.height = farCfg.shadowMapSize;
farSunLight.shadow.bias = farCfg.shadowBias;
const farShadowCam = farSunLight.shadow.camera;
farShadowCam.left = farShadowCam.bottom = -farCfg.shadowCameraSize;
farShadowCam.right = farShadowCam.top = farCfg.shadowCameraSize;
farShadowCam.near = SHADOW_CAM_NEAR;
farShadowCam.far = SHADOW_CAM_FAR;
farShadowCam.updateProjectionMatrix();
scene.add(farSunLight);
scene.add(farSunLight.target);

const coreMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(coreCfg.size, coreCfg.size),
  new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false }),
);

const haloMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(haloCfg.size, haloCfg.size),
  new THREE.MeshBasicMaterial({ color: haloCfg.color, fog: false, transparent: true, opacity: haloCfg.opacity, depthWrite: false }),
);
haloMesh.position.z = -0.5;

const sunGroup = new THREE.Group();
sunGroup.add(haloMesh);
sunGroup.add(coreMesh);
scene.add(sunGroup);

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
