import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { LevelEditor } from './editor.js'; // <--- ИМПОРТ РЕДАКТОРА
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG } from './config.js';

// Глобальные переменные
let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let assetsLoaded = 0;
const totalAssets = 2;

// Режимы
let isScoutMode = false; // Разведка (P)
let isEditorMode = false; // Редактор (9)

// Камера и управление
let cameraAngleH = 0;
let cameraAngleV = 0.5;
let scoutRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const scoutKeys = { w: false, s: false, a: false, d: false, ArrowUp: false, ArrowDown: false };
const scoutPosition = new THREE.Vector3();

// Клавиши машины
const keys = { w: false, a: false, s: false, d: false, shiftKey: false, arrowUp: false, arrowDown: false, arrowLeft: false, arrowRight: false };

const _v3CameraOffset = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);
const _v3LightPos = new THREE.Vector3();

const { scene, camera, renderer, sunLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

// Инициализация редактора
const editor = new LevelEditor(scene, camera);

function checkLoading() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        document.getElementById('loading').style.display = 'none';
        if (TELEPORT_TO_TENT) {
            carContainer.position.set(TARGET_POS.x, TARGET_POS.y, TARGET_POS.z);
            carContainer.rotation.y = Math.PI;
            _currentLookAt.set(0, 0.5, 0).applyMatrix4(carContainer.matrixWorld);
            speed = 0;
        } else {
            alignCarToTrack(carContainer, trackModel, carCenterHeight);
        }
        scoutPosition.copy(camera.position);
    }
}

loadTrack(scene, (model) => { trackModel = model; checkLoading(); });
loadCar(scene, carContainer, (carData) => { carCenterHeight = carData.centerHeight; checkLoading(); });

// --- УПРАВЛЕНИЕ ---
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    // РЕЖИМ РЕДАКТОРА (9)
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

    // РЕЖИМ РАЗВЕДКИ (P) - только если не редактор
    if (k === 'p' || k === 'з') {
        if (!isEditorMode) {
            isScoutMode = !isScoutMode;
            if (isScoutMode) {
                scoutPosition.copy(camera.position);
                scoutRotation.setFromQuaternion(camera.quaternion);
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
                camera.lookAt(_currentLookAt);
            }
        }
        return;
    }

    // Клавиши модификаторы
    if (e.key === 'Shift') keys.shiftKey = true;

    // Движение (Разведка / Редактор)
    if (isScoutMode) {
        if (k === 'w' || k === 'ц') scoutKeys.w = true;
        if (k === 's' || k === 'ы') scoutKeys.s = true;
        if (k === 'a' || k === 'ф') scoutKeys.a = true;
        if (k === 'd' || k === 'в') scoutKeys.d = true;
        if (e.key === 'ArrowUp') scoutKeys.ArrowUp = true;
        if (e.key === 'ArrowDown') scoutKeys.ArrowDown = true;
    } else {
        // Машина
        if (k === 'w' || k === 'ц') keys.w = true;
        if (k === 's' || k === 'ы') keys.s = true;
        if (k === 'a' || k === 'ф') keys.a = true;
        if (k === 'd' || k === 'в') keys.d = true;
    }

    // Стрелки для редактора (перемещение объекта)
    if (e.key === 'ArrowUp') keys.arrowUp = true;
    if (e.key === 'ArrowDown') keys.arrowDown = true;
    if (e.key === 'ArrowLeft') keys.arrowLeft = true;
    if (e.key === 'ArrowRight') keys.arrowRight = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') keys.shiftKey = false;

    if (e.key === 'ArrowUp') { scoutKeys.ArrowUp = false; keys.arrowUp = false; }
    if (e.key === 'ArrowDown') { scoutKeys.ArrowDown = false; keys.arrowDown = false; }
    if (e.key === 'ArrowLeft') { keys.arrowLeft = false; }
    if (e.key === 'ArrowRight') { keys.arrowRight = false; }

    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') { scoutKeys.w = false; keys.w = false; }
    if (k === 's' || k === 'ы') { scoutKeys.s = false; keys.s = false; }
    if (k === 'a' || k === 'ф') { scoutKeys.a = false; keys.a = false; }
    if (k === 'd' || k === 'в') { scoutKeys.d = false; keys.d = false; }
});

// Мышь: выбор объекта в редакторе
window.addEventListener('click', (e) => {
    if (isEditorMode) {
        editor.onMouseClick(e, camera);
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

// --- ФИЗИКА И ЛОГИКА ---
function updateCarPhysics() {
    if (isScoutMode) return;
    // ... (твоя старая физика машины) ...
    let movingForward = false;
    if (keys.w) movingForward = true;
    else if (keys.s) {
        if (!(speed > 0.002) && !(speed < -0.002)) movingForward = false;
    } else {
        speed *= CAR_CONFIG.friction;
        if (Math.abs(speed) < 0.0001) speed = 0;
    }
    // Упрощено для краткости, вставь свою полную физику сюда
    if (movingForward) speed += CAR_CONFIG.acceleration;
    if (keys.s && speed > 0) speed -= CAR_CONFIG.brakeForce;
    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (Math.abs(speed) > 0.0005) {
        const dir = speed > 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }
    carContainer.translateZ(speed);
    alignCarToTrack(carContainer, trackModel, carCenterHeight);
}

function updateScout() {
    if (!isScoutMode) return;
    const moveSpeed = 0.5; // Скорость полета
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; direction.normalize();
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

function updateCameraAndLight() {
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

function animate() {
    requestAnimationFrame(animate);

    if (isScoutMode) {
        updateScout();
        // Отображение координат камеры в разведке
        if (!isEditorMode) {
            const x = camera.position.x.toFixed(2);
            const y = camera.position.y.toFixed(2);
            const z = camera.position.z.toFixed(2);
            const el = document.getElementById('coords');
            if(el) el.innerText = `РАЗВЕДКА: X:${x} Y:${y} Z:${z}`;
        }
    } else {
        updateCarPhysics();
        updateCameraAndLight();
        updateUI(carContainer, speed);
    }

    // Логика редактора: перемещение объекта
    if (isEditorMode) {
        editor.moveObject(keys);
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});