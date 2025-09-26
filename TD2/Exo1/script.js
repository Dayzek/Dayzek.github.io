import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f2c);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(5, 6, 5);
scene.add(light);

const envLoader = new THREE.CubeTextureLoader();
const envMap = envLoader.load([
  'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
]);
scene.environment = envMap;

const ornament = new THREE.Group();
scene.add(ornament);

const ballGeo = new THREE.SphereGeometry(0.7, 64, 64);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xcc001a, metalness: 1, roughness: 0.15, envMapIntensity: 1.25 });
const bauble = new THREE.Mesh(ballGeo, ballMat);
ornament.add(bauble);

const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.3, envMapIntensity: 1.25 });
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.16, 32), goldMat);
cap.position.set(0, 0.78, 0);
ornament.add(cap);

const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 16, 24), goldMat);
ring.rotation.x = Math.PI / 2;
ring.position.set(0, 0.9, 0);
ornament.add(ring);

const stringGeom = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 1.02, 0),
  new THREE.Vector3(0, 2.2, 0)
]);
const string = new THREE.Line(stringGeom, new THREE.LineBasicMaterial({ color: 0xffffff }));
ornament.add(string);

const rainCount = 2000;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount * 3; i += 3) {
  rainPositions[i] = (Math.random() - 0.5) * 20;
  rainPositions[i + 1] = Math.random() * 20;
  rainPositions[i + 2] = (Math.random() - 0.5) * 20;
}
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
const rain = new THREE.Points(rainGeometry, rainMaterial);
scene.add(rain);

function animate(t) {
  ornament.rotation.y += 0.01;
  ornament.rotation.z = Math.sin(t * 0.0015) * 0.05;

  const p = rain.geometry.attributes.position.array;
  for (let i = 0; i < rainCount * 3; i += 3) {
    p[i + 1] -= 0.02;
    if (p[i + 1] < -5) p[i + 1] = 10;
  }
  rain.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
