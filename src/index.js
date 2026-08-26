import * as THREE from 'three';
import * as dat from 'dat.gui';
import './style.css';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import getStarfield from './textures/stars/star.js';
import earthbump1k from './textures/01_earthbump1k.jpg';
import img_2 from './textures/05_earthcloudmaptrans.jpg';
import img_3 from './textures/8081_earthlights10k.jpg';
import img_4 from './textures/02_earthspec1k.jpg';
import img_5 from './textures/earth_clouds_8K.png';
import img from './textures/Earth4kTexture.png';
import moon_img from './textures/Moon.jpg';
import moon_bum from './textures/moon_bum.jpg';
import satalite from './assets/models/satellite.glb';
import { getFresnelMat } from './textures/stars/getFrensilMat.js';
import { computeBenchmarks, updateCircular, fallToGround, updateElliptical, updateHyperbolic } from './physics.js';

const DIST_SCALE = 1e6;
const earthRadiusMeters = 7e6; // 6.371e6 ~approx: 7e6
const earthRadiusUnits = earthRadiusMeters / DIST_SCALE;
export const EARTH_RADIUS_M = 7e6;

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(earthRadiusUnits, detail);
const material = new THREE.MeshPhongMaterial({
    map: loader.load(img),
    specularMap: loader.load(img_4),
    bumpMap: loader.load(earthbump1k),
    bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load(img_3),
    blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
    map: loader.load(img_5),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    alphaMap: loader.load(img_2),
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({ numStars: 8000, radius: 100 });
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// ===============================================================================================

const moonGroop = new THREE.Group();
scene.add(moonGroop);
const MoonMaterial = new THREE.MeshStandardMaterial({
    map: loader.load(moon_img),
    bumpMap: loader.load(moon_bum),
    bumpScale: 2,
});

const moonMesh = new THREE.Mesh(geometry, MoonMaterial);
moonMesh.position.set(90, 0, 0);
moonMesh.scale.setScalar(0.27);
moonGroop.add(moonMesh);

const satelliteGroup = new THREE.Group();
scene.add(satelliteGroup);

const orbitGeometry = new THREE.RingGeometry(3.5, 3.51, 128);
const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
});
const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
orbit.rotation.x = Math.PI / 2;
scene.add(orbit);

const gltfLoader = new GLTFLoader();
let satellite;

gltfLoader.load(
    satalite,
    (gltf) => {
        satellite = gltf.scene;
        satellite.userData = {};
        satellite.scale.set(0.02, 0.02, 0.02);

        satellite.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x1a75ff,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x0047b3,
                    emissiveIntensity: 0.2,
                });
            }
        });

        satelliteGroup.add(satellite);
        satellite.position.set(5, 0, 0);

        const satelliteLight = new THREE.PointLight(0x1a75ff, 2, 15);
        satelliteLight.position.set(0, 0, 0);
        satellite.add(satelliteLight);
    },
    (progress) => {
        console.log('Loading satellite...', (progress.loaded / progress.total) * 100 + '%');
    },
    (error) => {
        console.error('Error loading satellite:', error);
    }
);

// ================================================================================ Physics

const params = {
    R: 7.2e6,
    R_Km: 0,
    Altitude: 0,
    M: 5.97e24,
    G: 6.674e-11,
    v: 0,
    perfectV: 0,
    escapeV: 0,
    intEscape: 0,
    vCurrent: 0,
    accel: 0,
    physPos: new THREE.Vector3(7e6, 0, 0),
};

// ******************************************************** GUI control panel

const gui = new dat.GUI({ width: 310 });

gui.add(params, 'R', 7e6, 43e6).step(2e5).name('Radius R [m]').onChange(recompute); // Radius is distance between sat & earth center at ground level 6371 km ~approx: 7e6 & for the furthest sat altitude is 35,786 Km ~approx: 36e6 (for that R = 43,000 Km)
gui.add(params, 'M', 1e23, 1e28).step(1e23).name('Mass M [kg]').onChange(recompute); // smallest is Mercury 3.3022 * 10e23 largest is Jupiter 1.8986 * 10e27.
gui.add(params, 'G', 1e-11, 1e-9).step(1e-11).name('G [m³/kg·s²]').onChange(recompute); // the gravitation constant is the same across the universe.

const vCtrl = gui
    .add(params, 'v', 0, 0)
    .step(1)
    .name('v [m/s]')
    .onChange((val) => {
        params.v = val;
    });

gui.add(params, 'Altitude').name('Alitiude Alt [km]').listen(); // Distance between sat & ground in real world sat can position from 193km~200 Km to 35,786~36,000 km
gui.add(params, 'R_Km').name('R [km]').listen();
gui.add(params, 'perfectV').name('v₀ (circ)').listen();
gui.add(params, 'escapeV').name('vₑ (escape)').listen();
gui.add(params, 'accel').name('a [m/s²]').listen();
gui.add(params, 'vCurrent').name('v [current]').listen();

function recompute() {
    computeBenchmarks(params);
    params.v = params.perfectV;
    vCtrl.max(params.escapeV * 1.2);
    vCtrl.updateDisplay();
    params.physPos.set(params.R, 0, 0);

    if (satellite) {
        delete satellite.userData.fallState;
        delete satellite.userData.crashed;
        delete satellite.userData.hyperbola;
        delete satellite.userData.velocity;
        params.Altitude = (params.R - EARTH_RADIUS_M) / 1e3;
    }
}

recompute();

// ================================================================================== Intializing values

params.v = params.perfectV;
params.physPos.set(params.R, 0, 0);
let lastTime = Date.now() * 0.001;
let regime;
let lastRegime = null;
let lastPhysPos = params.physPos.clone();
const TIME_SCALE = 600;

function animate() {
    requestAnimationFrame(animate);

    earthMesh.rotation.y += 0.002;
    lightsMesh.rotation.y += 0.002;
    cloudsMesh.rotation.y += 0.0023;
    glowMesh.rotation.y += 0.002;
    stars.rotation.y -= 0.00002;
    moonGroop.rotation.y += 0.001;

    const now = Date.now() * 0.001;
    let dt = now - lastTime;
    lastTime = now;
    const dtSim = dt * TIME_SCALE;
    const currentPos = params.physPos.clone();

    computeBenchmarks(params);

    if (Math.abs(params.v - params.perfectV) < 1e-6) {
        regime = 'circular';
    } else if (params.v < params.perfectV) {
        regime = 'fall';
        params.vCurrent = 0;
        params.Altitude = 0;
        params.R_Km = earthRadiusMeters / 1e3;
    } else if (params.v > params.perfectV && params.v < params.escapeV) {
        regime = 'elliptical';
    } else if (params.v >= params.escapeV) {
        regime = 'escape';
    }

    if (regime === 'escape' && lastRegime !== 'escape') {
        satellite.userData.hyperbola = {};
        satellite.userData.hyperbola.initialized = false;
    }

    // =================================================================== Applying Physics

    if (satellite) {
        if (regime === 'circular') {
            updateCircular(params, satellite, dtSim);
        } else if (regime === 'fall') {
            fallToGround(params, satellite, dtSim);
        } else if (regime === 'elliptical') {
            updateElliptical(params, satellite, dtSim);
        } else {
            updateHyperbolic(params, satellite, dtSim);
        }

        satellite.position.set(
            params.physPos.x / DIST_SCALE,
            params.physPos.y / DIST_SCALE,
            params.physPos.z / DIST_SCALE
        );
        satellite.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);

    lastRegime = regime;
    lastPhysPos.copy(currentPos);
}
animate();

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
