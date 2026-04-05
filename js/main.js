import * as THREE from 'three';
import { createScene, updateDayNightCycle, updateRain } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { LevelEditor } from './editor.js'; // Импорт редактора
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG } from './config.js';

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let isTrackLoaded = false;
let assetsLoaded = 0;
const totalAssets = 2; // Трек + Машина

let headlights = [];
let isRaining = false;

// Режимы
let isScoutMode = false;   // Разведка (P)
let isEditorMode = false;  // Редактор (9)

// Камера и управление
let cameraAngleH = 0;
let cameraAngleV = 0.5;

// Переменные для разведки
let scoutRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const scoutKeys = { w: false, s: false, a: false, d: false, ArrowUp: false, ArrowDown: false };
const scoutPosition = new THREE.Vector3();

// Клавиши управления (машина + общие)
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowLeft: false, ArrowRight: false,
    ArrowUp: false, ArrowDown: false,
    shiftKey: false // Для редактора
};

const _v3CameraOffset = new THREE.Vector3();
const _v3LookAt = new THREE.Vector3(0, 1, 0);
const _v3LightPos = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

// Инициализация сцены
const { scene, camera, renderer, sunLight, ambientLight, hemiLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

// Инициализация редактора
const editor = new LevelEditor(scene, camera);

// --- ЗАГРУЗКА ---
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
        
        // Старт позиции для разведки
        scoutPosition.copy(camera.position);
    }
}

loadTrack(scene, (model) => { 
    trackModel = model; 
    checkLoading(); 
});

loadCar(scene, carContainer, (carData) => {
    carCenterHeight = carData.centerHeight;
    headlights = carData.headlights || [];
    checkLoading();
});

// --- ОБРАБОТКА КЛАВИШ ---
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    // 1. РЕЖИМ РЕДАКТОРА (9) - ПРИОРИТЕТ
    if (k === '9') {
        isEditorMode = editor.toggle();
        if (isEditorMode) {
            isScoutMode = true; // В редакторе всегда режим полета
            scoutPosition.copy(camera.position);
            scoutRotation.setFromQuaternion(camera.quaternion);
            document.body.requestPointerLock();
        } else {
            document.exitPointerLock();
            isScoutMode = false;
            camera.lookAt(_currentLookAt);
        }
        return;
    }

    // 2. РЕЖИМ РАЗВЕДКИ (P или З) - ТОЛЬКО ЕСЛИ НЕ РЕДАКТОР
    if ((k === 'p' || k === 'з') && !isEditorMode) {
        isScoutMode = !isScoutMode;
        if (isScoutMode) {
            scoutPosition.copy(camera.position);
            scoutRotation.setFromQuaternion(camera.quaternion);
            document.body.requestPointerLock();
            console.log("--- РАЗВЕДКА ВКЛЮЧЕНА ---");
        } else {
            document.exitPointerLock();
            console.log("--- РАЗВЕДКА ВЫКЛЮЧЕНА ---");
            camera.lookAt(_currentLookAt);
        }
        return;
    }

    // 3. ДОЖДЬ (0)
    if (k === '0') {
        isRaining = !isRaining;
        console.log("Дождь:", isRaining ? "ВКЛ" : "ВЫКЛ");
        return;
    }

    // 4. УПРАВЛЕНИЕ ДВИЖЕНИЕМ
    if (isScoutMode) {
        // Управление камерой в режиме разведки/редактора
        if (k === 'w' || k === 'ц') scoutKeys.w = true;
        if (k === 's' || k === 'ы') scoutKeys.s = true;
        if (k === 'a' || k === 'ф') scoutKeys.a = true;
        if (k === 'd' || k === 'в') scoutKeys.d = true;
        if (e.key === 'ArrowUp') scoutKeys.ArrowUp = true;
        if (e.key === 'ArrowDown') scoutKeys.ArrowDown = true;
    } else {
        // Управление машиной
        if (k === 'w' || k === 'ц') keys.w = true;
        if (k === 's' || k === 'ы') keys.s = true;
        if (k === 'a' || k === 'ф') keys.a = true;
        if (k === 'd' || k === 'в') keys.d = true;
    }

    // Общие клавиши (стрелки для камеры машины и движения объектов)
    if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.key === 'ArrowRight') keys.ArrowRight = true;
    if (e.key === 'ArrowUp') keys.ArrowUp = true;
    if (e.key === 'ArrowDown') keys.ArrowDown = true;
    if (e.key === 'Shift') keys.shiftKey = true;
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();

    if (isScoutMode) {
        if (k === 'w' || k === 'ц') scoutKeys.w = false;
        if (k === 's' || k === 'ы') scoutKeys.s = false;
        if (k === 'a' || k === 'ф') scoutKeys.a = false;
        if (k === 'd' || k === 'в') scoutKeys.d = false;
        if (e.key === 'ArrowUp') scoutKeys.ArrowUp = false;
        if (e.key === 'ArrowDown') scoutKeys.ArrowDown = false;
    } else {
        if (k === 'w' || k === 'ц') keys.w = false;
        if (k === 's' || k === 'ы') keys.s = false;
        if (k === 'a' || k === 'ф') keys.a = false;
        if (k === 'd' || k === 'в') keys.d = false;
    }

    if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.key === 'ArrowRight') keys.ArrowRight = false;
    if (e.key === 'ArrowUp') keys.ArrowUp = false;
    if (e.key === 'ArrowDown') keys.ArrowDown = false;
    if (e.key === 'Shift') keys.shiftKey = false;
});

// Управление мышью (только в режиме разведки/редактора)
document.addEventListener('mousemove', (e) => {
    if (isScoutMode && document.pointerLockElement === document.body) {
        scoutRotation.y -= e.movementX * 0.002;
        scoutRotation.x -= e.movementY * 0.002;
        scoutRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, scoutRotation.x));
        camera.rotation.copy(scoutRotation);
    }
});

// Клик мыши (для выбора объектов в редакторе)
window.addEventListener('click', (e) => {
    if (isEditorMode) {
        editor.onMouseClick(e);
    }
});

// --- ФИЗИКА МАШИНЫ ---
function updateCarPhysics() {
    if (isScoutMode) return;

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

// --- ЛОГИКА РАЗВЕДЧИКА (ПОЛЕТ) ---
function updateScout() {
    if (!isScoutMode) return;

    const moveSpeed = 0.1; // Медленная скорость для точности
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

// --- КАМЕРА СЛЕДОВАНИЯ (МАШИНА) ---
function updateCameraAndLight() {
    if (isScoutMode) return;

    const rotationSpeed = 0.04;
    // Поворот камеры стрелками
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

// --- ГЛАВНЫЙ ЦИКЛ ---
let elapsedTime = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedTime += delta;

    // 1. Время суток и погода
    const isNight = updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, elapsedTime, isRaining);
    updateRain(camera);

    // 2. Фары машины
    const targetHeadlightIntensity = isNight ? 20 : 0;
    headlights.forEach(light => {
        light.intensity += (targetHeadlightIntensity - light.intensity) * 0.1;
    });

    // 3. Логика режимов
    if (isScoutMode) {
        updateScout();
        
        // Отображение координат
        const x = camera.position.x.toFixed(2);
        const y = camera.position.y.toFixed(2);
        const z = camera.position.z.toFixed(2);
        
        const coordsEl = document.getElementById('coords');
        if (coordsEl) {
            if (isEditorMode) {
                // В редакторе координаты пишет сам редактор в свой блок, 
                // но можно продублировать или оставить пустым, чтобы не мешал
            } else {
                coordsEl.innerText = `РАЗВЕДКА: X: ${x} | Y: ${y} | Z: ${z} (Нажми P)`;
                coordsEl.style.display = 'block';
            }
        }
    } else {
        updateCarPhysics();
        alignCarToTrack(carContainer, trackModel, carCenterHeight);
        updateCameraAndLight();
        updateUI(carContainer, speed);
        
        // Скрываем координаты разведки если они есть
        const coordsEl = document.getElementById('coords');
        if (coordsEl && coordsEl.id !== 'object-coords') coordsEl.style.display = 'none';
    }

    // 4. Логика редактора (перемещение объектов)
    if (isEditorMode) {
        editor.moveObject(keys);
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
