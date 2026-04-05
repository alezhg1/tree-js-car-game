import * as THREE from 'three';
import { createScene, updateDayNightCycle } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG, TIME_CONFIG } from './config.js';

let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let isTrackLoaded = false;
let assetsLoaded = 0;
const totalAssets = 2;
let headlights = [];

let elapsedTime = 0;
const clock = new THREE.Clock();

const keys = { w: false, a: false, s: false, d: false };
const _v3CameraOffset = new THREE.Vector3();
const _v3LookAt = new THREE.Vector3(0, 1, 0);
const _v3LightPos = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

const { scene, camera, renderer, sunLight, ambientLight, hemiLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

function checkLoading() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        document.getElementById('loading').style.display = 'none';
        isTrackLoaded = true;
        if (TELEPORT_TO_TENT) {
            carContainer.position.set(TARGET_POS.x, TARGET_POS.y, TARGET_POS.z);
            carContainer.rotation.y = Math.PI;
            _currentLookAt.set(0, 0.5, 0).applyMatrix4(carContainer.matrixWorld);
            speed = 0;
        } else {
            alignCarToTrack(carContainer, trackModel, carCenterHeight);
        }
    }
}

loadTrack(scene, (model) => { trackModel = model; checkLoading(); });
loadCar(scene, carContainer, (carData) => {
    carCenterHeight = carData.centerHeight;
    headlights = carData.headlights || [];
    checkLoading();
});

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k==='w'||k==='ц') keys.w=true;
    if(k==='s'||k==='ы') keys.s=true;
    if(k==='a'||k==='ф') keys.a=true;
    if(k==='d'||k==='в') keys.d=true;
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k==='w'||k==='ц') keys.w=false;
    if(k==='s'||k==='ы') keys.s=false;
    if(k==='a'||k==='ф') keys.a=false;
    if(k==='d'||k==='в') keys.d=false;
});

function updateCarPhysics() {
    let movingForward = false;
    if (keys.w) movingForward = true;
    else if (keys.s) {
        if (!(speed > 0.002) && !(speed < -0.002)) movingForward = false;
    } else {
        speed *= CAR_CONFIG.friction;
        if (Math.abs(speed) < 0.0001) speed = 0;
    }

    let collisionDetected = false;
    if (movingForward) {
        if (checkCollisions(carContainer, trackModel, carCenterHeight, 1)) collisionDetected = true;
    } else if (keys.s && speed >= 0) {
         if (checkCollisions(carContainer, trackModel, carCenterHeight, -1)) collisionDetected = true;
    } else if (speed > 0.001) {
        if (checkCollisions(carContainer, trackModel, carCenterHeight, 1)) collisionDetected = true;
    } else if (speed < -0.001) {
        if (checkCollisions(carContainer, trackModel, carCenterHeight, -1)) collisionDetected = true;
    }

    if (collisionDetected) {
        speed = 0;
        if (movingForward || speed > 0) carContainer.translateZ(-0.05);
        else carContainer.translateZ(0.05);
        return;
    }

    if (keys.w) speed += CAR_CONFIG.acceleration;
    else if (keys.s) {
        if (speed > 0.002) speed -= CAR_CONFIG.brakeForce;
        else if (speed < -0.002) speed += CAR_CONFIG.brakeForce;
        else if (keys.s) speed -= CAR_CONFIG.acceleration * 0.5;
    }

    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;

    if (Math.abs(speed) > 0.0005) {
        const dir = speed > 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }
    carContainer.translateZ(speed);
}

function updateCameraAndLight() {
    _v3LightPos.copy(carContainer.position).add(new THREE.Vector3(40, 100, 40));
    sunLight.position.copy(_v3LightPos);
    sunLight.target = carContainer;
    sunLight.target.updateMatrixWorld();

    _v3CameraOffset.set(0, CAMERA_CONFIG.height, -CAMERA_CONFIG.distance);
    _v3CameraOffset.applyMatrix4(carContainer.matrixWorld);
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);

    const targetLookAt = new THREE.Vector3(0, 0.5, 30);
    targetLookAt.applyMatrix4(carContainer.matrixWorld);
    _currentLookAt.lerp(targetLookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedTime += delta;

    const isNight = updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, elapsedTime);

    // Включение фар
    const targetIntensity = isNight ? TIME_CONFIG.headlightIntensity : 0;
    headlights.forEach(light => {
        // Плавное изменение яркости
        light.intensity += (targetIntensity - light.intensity) * 0.05;
    });

    updateCarPhysics();
    alignCarToTrack(carContainer, trackModel, carCenterHeight);
    updateCameraAndLight();
    updateUI(carContainer, speed);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});