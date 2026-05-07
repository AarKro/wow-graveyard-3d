import * as THREE from 'three';
import { EffectComposer, RenderPass } from 'postprocessing';
import { GodraysPass } from 'three-good-godrays';
import { scene } from './scene';
import { farSunLight } from './sun';
import config from './data/config.json';


export const buildComposer = (renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): EffectComposer => {
  let composer: EffectComposer;
  
  composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const cfg = config.sun.godrays;
  const godraysPass = new GodraysPass(farSunLight, camera, {
    density: cfg.density,
    maxDensity: cfg.maxDensity,
    distanceAttenuation: cfg.distanceAttenuation,
    color: new THREE.Color(cfg.color),
    raymarchSteps: cfg.raymarchSteps,
    blur: cfg.blur,
    gammaCorrection: cfg.gammaCorrection,
  });
  godraysPass.renderToScreen = true;
  composer.addPass(godraysPass);
  
  return composer;
};
