import * as THREE from 'three';
import { createScene, updateDayNightCycle, updateRain } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG } from './config.js';

let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let isTrackLoaded = false;
let assetsLoaded = 0;
const totalAssets = 2;
let headlights = [];
let isRaining = false; // Состояние дождя

// Камера
let cameraAngleH = 0;
let cameraAngleV = 0.5;
const keys = { w: false, a: false, s: false, d: false, ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
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

    // ВКЛЮЧЕНИЕ ДОЖДЯ НА "0"
    if (k === '0') {
        isRaining = !isRaining;
        console.log("Дождь:", isRaining ? "ВКЛ" : "ВЫКЛ");
        return;
    }

    if(k==='w'||k==='ц') keys.w=true;
    if(k==='s'||k==='ы') keys.s=true;
    if(k==='a'||k==='ф') keys.a=true;
    if(k==='d'||k==='в') keys.d=true;
    if(e.key === 'ArrowLeft') keys.ArrowLeft = true;
    if(e.key === 'ArrowRight') keys.ArrowRight = true;
    if(e.key === 'ArrowUp') keys.ArrowUp = true;
    if(e.key === 'ArrowDown') keys.ArrowDown = true;
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k==='w'||k==='ц') keys.w=false;
    if(k==='s'||k==='ы') keys.s=false;
    if(k==='a'||k==='ф') keys.a=false;
    if(k==='d'||k==='в') keys.d=false;
    if(e.key === 'ArrowLeft') keys.ArrowLeft = false;
    if(e.key === 'ArrowRight') keys.ArrowRight = false;
    if(e.key === 'ArrowUp') keys.ArrowUp = false;
    if(e.key === 'ArrowDown') keys.ArrowDown = false;
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
    const rotationSpeed = 0.04;
    if (keys.ArrowLeft) cameraAngleH += rotationSpeed;
    if (keys.ArrowRight) cameraAngleH -= rotationSpeed;
    if (keys.ArrowUp) cameraAngleV = Math.min(cameraAngleV + rotationSpeed, 1.2);
    if (keys.ArrowDown) cameraAngleV = Math.max(cameraAngleV - rotationSpeed, 0.1);

    _v3LightPos.copy(carContainer.position).add(new THREE.Vector3(40, 100, 40));
    sunLight.position.copy(_v3LightPos);
    sunLight.target = carContainer;
    sunLight.target.updateMatrixWorld();

    const distance = CAMERA_CONFIG.distance;
    const heightOffset = Math.sin(cameraAngleV) * distance;
    const horizontalDist = Math.cos(cameraAngleV) * distance;
    const carRotationY = carContainer.rotation.y;
    const totalAngle = carRotationY + cameraAngleH;

    const offsetX = Math.sin(totalAngle) * horizontalDist;
    const offsetZ = Math.cos(totalAngle) * horizontalDist;
    const offsetY = heightOffset + CAMERA_CONFIG.height;

    const lookAtX = carContainer.position.x + Math.sin(carRotationY) * 10;
    const lookAtZ = carContainer.position.z + Math.cos(carRotationY) * 10;
    const lookAtY = carContainer.position.y + 0.5;

    const targetCamX = carContainer.position.x - offsetX;
    const targetCamZ = carContainer.position.z - offsetZ;
    const targetCamY = carContainer.position.y + offsetY;

    _v3CameraOffset.set(targetCamX, targetCamY, targetCamZ);
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);

    const targetLookAt = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
    _currentLookAt.lerp(targetLookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);
}

let elapsedTime = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedTime += delta;

    // Обновление цикла дня/ночи и погоды
    const isNight = updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, elapsedTime, isRaining);

    // Обновление дождя
    updateRain(camera);

    // Управление фарами (включаются ночью)
    const targetHeadlightIntensity = isNight ? 20 : 0;
    headlights.forEach(light => {
        light.intensity += (targetHeadlightIntensity - light.intensity) * 0.1;
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