import * as THREE from 'three';
import { scene } from './scene';
import config from './data/config.json';

const SUN_DISTANCE = config.sun.distance;
const SUN_DIRECTION = new THREE.Vector3(
  config.sun.direction[0], config.sun.direction[1], config.sun.direction[2],
).normalize();
const SHADOW_CAM_NEAR = config.sun.shadowCameraNear;
const SHADOW_CAM_FAR = config.sun.shadowCameraFar;
const lightCfg = config.sun.light;

export const farSunLight = new THREE.DirectionalLight(lightCfg.color, lightCfg.intensity);
farSunLight.castShadow = true;
farSunLight.shadow.mapSize.width = lightCfg.shadowMapSize;
farSunLight.shadow.mapSize.height = lightCfg.shadowMapSize;
farSunLight.shadow.bias = lightCfg.shadowBias;
const shadowCam = farSunLight.shadow.camera;
shadowCam.left = shadowCam.bottom = -lightCfg.shadowCameraSize;
shadowCam.right = shadowCam.top = lightCfg.shadowCameraSize;
shadowCam.near = SHADOW_CAM_NEAR;
shadowCam.far = SHADOW_CAM_FAR;
shadowCam.updateProjectionMatrix();
scene.add(farSunLight);
scene.add(farSunLight.target);

const buildSunTexture = (): THREE.CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const border = size * 0.13;
  ctx.fillStyle = '#ff8d13';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffa513';
  ctx.fillRect(border, border, size - border * 2, size - border * 2);
  return new THREE.CanvasTexture(canvas);
}

const buildGlowTexture = (): THREE.CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const border = size * 0.13;
  ctx.fillStyle = 'rgba(255, 160, 30, 0.5)';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255, 240, 180, 0.6)';
  ctx.fillRect(border, border, size - border * 2, size - border * 2);
  return new THREE.CanvasTexture(canvas);
};

const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: buildSunTexture(),
  fog: false,
  depthWrite: false,
  transparent: true,
  opacity: 0.25,
}));
sunSprite.scale.setScalar(config.sun.spriteSize);
sunSprite.renderOrder = 0;
scene.add(sunSprite);

const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: buildGlowTexture(),
  fog: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
}));
sunGlow.scale.setScalar(config.sun.spriteSize);
sunGlow.renderOrder = 1;
scene.add(sunGlow);

const sunWorldPos = new THREE.Vector3();

export const updateSun = (playerPos: THREE.Vector3): void => {
  sunWorldPos.copy(playerPos).addScaledVector(SUN_DIRECTION, SUN_DISTANCE);

  sunGlow.position.copy(sunWorldPos);
  sunSprite.position.copy(sunWorldPos);

  farSunLight.position.copy(sunWorldPos);
  farSunLight.target.position.copy(playerPos);
  farSunLight.target.updateMatrixWorld();
};
