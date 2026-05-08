import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { sizes } from './utils';
import { scene } from './scene';
import type { GraveData } from './graves';

export const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(sizes.width, sizes.height);
labelRenderer.domElement.classList.add('label-renderer');
document.body.appendChild(labelRenderer.domElement);

type LabelEntry = { elements: HTMLElement[]; worldPos: THREE.Vector3; triggerRadiusSq: number };
const entries: LabelEntry[] = [];

const attach = (el: HTMLElement, pos: THREE.Vector3): void => {
  const obj = new CSS2DObject(el);
  obj.position.copy(pos);
  scene.add(obj);
};

export const addGraveLabel = (
  data: GraveData,
  gravePos: THREE.Vector3,
  triggerRadius: number,
): void => {
  const top = document.createElement('div');
  top.className = 'grave-label';

  const name = document.createElement('p');
  name.className = 'grave-label__name';
  name.textContent = data.name;

  const subtitle = document.createElement('p');
  subtitle.className = 'grave-label__subtitle';
  subtitle.textContent = `${data.race} ${data.class} — lvl ${data.level}`;

  const quote = document.createElement('p');
  quote.className = 'grave-label__quote';
  quote.textContent = data.quote;

  top.append(name, subtitle, quote);
  attach(top, gravePos.clone().add(new THREE.Vector3(0, 4, 0)));

  const bottom = document.createElement('div');
  bottom.className = 'grave-label';

  const dates = document.createElement('p');
  dates.className = 'grave-label__dates';
  dates.textContent = `${data.fromDate} – ${data.toDate}`;

  bottom.append(dates);
  attach(bottom, gravePos.clone());

  entries.push({ elements: [top, bottom], worldPos: gravePos.clone(), triggerRadiusSq: triggerRadius * triggerRadius });
};

export const updateLabels = (playerPos: THREE.Vector3): void => {
  for (const entry of entries) {
    const dx = playerPos.x - entry.worldPos.x;
    const dz = playerPos.z - entry.worldPos.z;
    const opacity = dx * dx + dz * dz < entry.triggerRadiusSq ? '1' : '0';
    for (const el of entry.elements) el.style.opacity = opacity;
  }
};
