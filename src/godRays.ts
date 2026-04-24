import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { sizes } from './utils';

const NUM_SAMPLES = 60;

// ── Occlusion scene ──────────────────────────────────────────────────────────
// We render only the sun disc (white) against a black background into a
// quarter-resolution target. The radial blur reads from THIS texture so only
// the actual sun contributes to the rays — not the player, terrain or sky.
const occlusionScene = new THREE.Scene();
occlusionScene.background = new THREE.Color(0x000000);

// Solid core — gives the rays a bright origin point
const sunOcclusionDisc = new THREE.Mesh(
  new THREE.PlaneGeometry(150, 150),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
occlusionScene.add(sunOcclusionDisc);

// Large soft halo behind the core — widens the source so rays spread over a
// broader angle rather than converging to a sharp pencil point
const sunOcclusionHalo = new THREE.Mesh(
  new THREE.PlaneGeometry(550, 550),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30 }),
);
sunOcclusionHalo.position.z = -1; // just behind the core
occlusionScene.add(sunOcclusionHalo);

const occlusionTarget = new THREE.WebGLRenderTarget(
  Math.round(sizes.width  / 4),
  Math.round(sizes.height / 4),
);

// ── Radial-blur composite shader ─────────────────────────────────────────────
const GodRaysShader = {
  uniforms: {
    tDiffuse:    { value: null as THREE.Texture | null },
    tOcclusion:  { value: null as THREE.Texture | null },
    sunPosition: { value: new THREE.Vector2(0.5, 0.5) },
    exposure:    { value: 0.10 },
    decay:       { value: 0.97 },
    density:     { value: 0.96 },
    weight:      { value: 0.35 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D tOcclusion;
    uniform vec2  sunPosition;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;
    varying vec2 vUv;

    void main() {
      vec2 texCoord  = vUv;
      vec2 deltaTexC = (texCoord - sunPosition) * (1.0 / float(${NUM_SAMPLES})) * density;
      float illuminationDecay = 1.0;
      vec4  rays = vec4(0.0);

      for (int i = 0; i < ${NUM_SAMPLES}; i++) {
        texCoord -= deltaTexC;
        vec4 samp = texture2D(tOcclusion, texCoord);
        samp     *= illuminationDecay * weight;
        rays     += samp;
        illuminationDecay *= decay;
      }

      rays *= exposure;
      gl_FragColor = texture2D(tDiffuse, vUv) + rays;
    }
  `,
};

export type GodRaysPass = ShaderPass;

export const initComposer = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  cam: THREE.Camera,
): { composer: EffectComposer; godRaysPass: GodRaysPass } => {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));

  const godRaysPass = new ShaderPass(GodRaysShader);
  godRaysPass.renderToScreen = true;
  composer.addPass(godRaysPass);

  return { composer, godRaysPass };
};

const _ndc = new THREE.Vector3();

export const renderGodRays = (
  renderer: THREE.WebGLRenderer,
  sunWorldPos: THREE.Vector3,
  cam: THREE.Camera,
  godRaysPass: GodRaysPass,
): void => {
  // Keep occlusion geometry aligned with the real sun, billboarded to camera
  sunOcclusionDisc.position.copy(sunWorldPos);
  sunOcclusionDisc.lookAt(cam.position);
  sunOcclusionHalo.position.copy(sunWorldPos);
  sunOcclusionHalo.lookAt(cam.position);

  // Render sun-only scene to low-res target
  renderer.setRenderTarget(occlusionTarget);
  renderer.render(occlusionScene, cam);
  renderer.setRenderTarget(null);

  // Feed the occlusion texture into the composite shader
  godRaysPass.uniforms['tOcclusion'].value = occlusionTarget.texture;

  // Project sun world position to UV screen space
  cam.updateMatrixWorld();
  _ndc.copy(sunWorldPos).project(cam);

  const behind = _ndc.z > 1.0;
  godRaysPass.uniforms['exposure'].value = behind ? 0.0 : 0.22;

  (godRaysPass.uniforms['sunPosition'].value as THREE.Vector2).set(
    _ndc.x *  0.5 + 0.5,
    _ndc.y * -0.5 + 0.5,
  );
};
