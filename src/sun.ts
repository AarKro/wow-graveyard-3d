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
const fillCfg = config.sun.fillLight;

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

// second light to ensure all objects throw faint shadows even when the sun is blocked
const fillLight = new THREE.DirectionalLight(fillCfg.color, fillCfg.intensity);
fillLight.castShadow = true;
fillLight.shadow.mapSize.width = fillCfg.shadowMapSize;
fillLight.shadow.mapSize.height = fillCfg.shadowMapSize;
fillLight.shadow.bias = fillCfg.shadowBias;
const fillShadowCam = fillLight.shadow.camera;
fillShadowCam.left = fillShadowCam.bottom = -fillCfg.shadowCameraSize;
fillShadowCam.right = fillShadowCam.top = fillCfg.shadowCameraSize;
fillShadowCam.near = fillCfg.shadowCameraNear;
fillShadowCam.far = fillCfg.shadowCameraFar;
fillShadowCam.updateProjectionMatrix();
scene.add(fillLight);
scene.add(fillLight.target);

const spriteCfg = config.sun.sprite;

// Shared builder for the two-layer (border + core) square sprite textures
// used by both the sun disc and the glow quad.
const buildSpriteTexture = (
  borderColor: string, borderOpacity: number,
  coreColor: string, coreOpacity: number,
): THREE.CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const inset = size * spriteCfg.borderRatio;
  ctx.globalAlpha = borderOpacity;
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = coreOpacity;
  ctx.fillStyle = coreColor;
  ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2);
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
};

const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: buildSpriteTexture(spriteCfg.discBorderColor, 1, spriteCfg.discCoreColor, 1),
  fog: false,
  depthWrite: false,
  transparent: true,
  opacity: spriteCfg.discOpacity,
}));
sunSprite.scale.setScalar(spriteCfg.size);
sunSprite.renderOrder = 0;
scene.add(sunSprite);

const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: buildSpriteTexture(spriteCfg.glowBorderColor, spriteCfg.glowBorderOpacity, spriteCfg.glowCoreColor, spriteCfg.glowCoreOpacity),
  fog: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
}));
sunGlow.scale.setScalar(spriteCfg.size);
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

  fillLight.position.copy(sunWorldPos);
  fillLight.target.position.copy(playerPos);
  fillLight.target.updateMatrixWorld();
};
