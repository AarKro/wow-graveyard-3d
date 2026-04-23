import { SCENE_UTIL } from './utils';
import { buildFloor } from './floor';

buildFloor();

SCENE_UTIL.loadGLTF('src/assets/penguin_club_penguin/scene.gltf', (gltf) => {
  gltf.scene.position.set(0, 2, 0);
  gltf.scene.scale.set(0.5, 0.5, 0.5);
});
