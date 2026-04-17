import * as THREE from 'three';
import { sizes } from './utils';

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 3;

export { camera };