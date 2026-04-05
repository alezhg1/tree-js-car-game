import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG } from './config.js';

// Глобальные переменные
let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let isTrackLoaded = false;
let assetsLoaded = 0;
const totalAssets = 2;

const keys = { w: false, a: false, s: false, d: false };
const _v3CameraOffset = new THREE.Vector3();
const _v3LookAt = new THREE.Vector3(0, 1, 0);
const _v3LightPos = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

// Переменные для режима разведки (поиск координат)
let isScoutMode = false;
let scoutRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const scoutKeys = { w: false, s: false, a: false, d: false, ArrowUp: false, ArrowDown: false };
const scoutPosition = new THREE.Vector3();

// Инициализация
const { scene, camera, renderer, sunLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

// Загрузка ресурсов
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

        // Инициализируем позицию разведчика текущей позицией камеры
        scoutPosition.copy(camera.position);
    }
}

loadTrack(scene, (model) => {
    trackModel = model;
    checkLoading();
});

loadCar(scene, carContainer, (carData) => {
    carCenterHeight = carData.centerHeight;
    checkLoading();
});

// Управление
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    // ВКЛЮЧЕНИЕ РЕЖИМА РАЗВЕДКИ (Поиск координат)
    if (k === 'p' || k === 'з') {
        isScoutMode = !isScoutMode;
        if (isScoutMode) {
            scoutPosition.copy(camera.position);
            scoutRotation.setFromQuaternion(camera.quaternion);
            document.body.requestPointerLock();
            console.log("--- РЕЖИМ РАЗВЕДКИ ---");
            console.log("Летай мышкой и WASD + Стрелки");
            console.log("Нажми P еще раз, чтобы выйти и увидеть координаты в углу экрана");
        } else {
            document.exitPointerLock();
            console.log("--- ВЫХОД ИЗ РАЗВЕДКИ ---");
            // Возвращаем камеру к машине
            camera.lookAt(_currentLookAt);
        }
        return;
    }

    if (isScoutMode) {
        if (k === 'w' || k === 'ц') scoutKeys.w = true;
        if (k === 's' || k === 'ы') scoutKeys.s = true;
        if (k === 'a' || k === 'ф') scoutKeys.a = true;
        if (k === 'd' || k === 'в') scoutKeys.d = true;
        if (e.key === 'ArrowUp') scoutKeys.ArrowUp = true;
        if (e.key === 'ArrowDown') scoutKeys.ArrowDown = true;
    } else {
        if (k === 'w' || k === 'ц') keys.w = true;
        if (k === 's' || k === 'ы') keys.s = true;
        if (k === 'a' || k === 'ф') keys.a = true;
        if (k === 'd' || k === 'в') keys.d = true;
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = false;
    if (k === 's' || k === 'ы') keys.s = false;
    if (k === 'a' || k === 'ф') keys.a = false;
    if (k === 'd' || k === 'в') keys.d = false;

    if (isScoutMode) {
        if (k === 'w' || k === 'ц') scoutKeys.w = false;
        if (k === 's' || k === 'ы') scoutKeys.s = false;
        if (k === 'a' || k === 'ф') scoutKeys.a = false;
        if (k === 'd' || k === 'в') scoutKeys.d = false;
        if (e.key === 'ArrowUp') scoutKeys.ArrowUp = false;
        if (e.key === 'ArrowDown') scoutKeys.ArrowDown = false;
    }
});

document.addEventListener('mousemove', (e) => {
    if (isScoutMode && document.pointerLockElement === document.body) {
        scoutRotation.y -= e.movementX * 0.002;
        scoutRotation.x -= e.movementY * 0.002;
        scoutRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, scoutRotation.x));
        camera.rotation.copy(scoutRotation);
    }
});

// Физика
function updateCarPhysics() {
    if (isScoutMode) return; // Пауза физики в режиме разведки

    let movingForward = false;
    let movingBackward = false;
    if (keys.w) {
        movingForward = true;
    } else if (keys.s) {
        if (speed > 0.002) { }
        else if (speed < -0.002) { }
        else { movingBackward = true; }
    } else {
        speed *= CAR_CONFIG.friction;
        if (Math.abs(speed) < 0.0001) speed = 0;
    }

    let collisionDetected = false;
    if (movingForward) {
        if (checkCollisions(carContainer, trackModel, carCenterHeight, 1)) collisionDetected = true;
    } else if (movingBackward && speed >= 0) {
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

// Логика разведчика (полет камеры)
function updateScout() {
    if (!isScoutMode) return;

    const moveSpeed = 0.5;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    if (scoutKeys.w) scoutPosition.addScaledVector(direction, moveSpeed);
    if (scoutKeys.s) scoutPosition.addScaledVector(direction, -moveSpeed);
    if (scoutKeys.a) scoutPosition.addScaledVector(right, moveSpeed);
    if (scoutKeys.d) scoutPosition.addScaledVector(right, -moveSpeed);
    if (scoutKeys.ArrowUp) scoutPosition.y += moveSpeed;
    if (scoutKeys.ArrowDown) scoutPosition.y -= moveSpeed;

    camera.position.copy(scoutPosition);
}

// Камера и свет (для машины)
function updateCarCamera() {
    if (isScoutMode) return;

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

// Цикл анимации
function animate() {
    requestAnimationFrame(animate);

    if (isScoutMode) {
        updateScout();
        // В режиме разведки машину не обновляем и UI показываем координаты камеры
        const x = camera.position.x.toFixed(2);
        const y = camera.position.y.toFixed(2);
        const z = camera.position.z.toFixed(2);
        document.getElementById('coords').innerText = `РАЗВЕДКА: X: ${x} | Y: ${y} | Z: ${z} (Нажми P для выхода)`;
    } else {
        updateCarPhysics();
        alignCarToTrack(carContainer, trackModel, carCenterHeight);
        updateCarCamera();
        updateUI(carContainer, speed);
    }

    renderer.render(scene, camera);
}
animate();

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});