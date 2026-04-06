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

// Переменные для оптимизации
let lastCollisionCheckDir = 0; // Запоминаем направление, чтобы не пересчитывать лишний раз

const keys = { w: false, a: false, s: false, d: false };
const _v3CameraOffset = new THREE.Vector3();
const _v3LookAt = new THREE.Vector3(0, 1, 0);
const _v3LightPos = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

// Инициализация
const { scene, camera, renderer, sunLight } = createScene();
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
    checkLoading();
});

// Управление
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

// --- ФИЗИКА (ОПТИМИЗИРОВАННАЯ) ---
function updateCarPhysics() {
    let movingForward = false;
    let movingBackward = false;
    let currentMoveDir = 0; // 1 = вперед, -1 = назад, 0 = нет движения

    // 1. Определяем намерения игрока
    if (keys.w) {
        movingForward = true;
        currentMoveDir = 1;
    } else if (keys.s) {
        if (speed > 0.002) {
            // Торможение при движении вперед
            currentMoveDir = 0; 
        } else if (speed < -0.002) {
            // Торможение при движении назад
            currentMoveDir = 0;
        } else {
            // Начало движения назад
            movingBackward = true;
            currentMoveDir = -1;
        }
    } else {
        // Инерция
        speed *= CAR_CONFIG.friction;
        if (Math.abs(speed) < 0.0001) speed = 0;
        
        // Если катимся по инерции, определяем направление для коллизий
        if (speed > 0.001) currentMoveDir = 1;
        else if (speed < -0.001) currentMoveDir = -1;
        else currentMoveDir = 0;
    }

    // 2. ПРОВЕРКА КОЛЛИЗИЙ (ТОЛЬКО ОДНА ЗА КАДР!)
    let collisionDetected = false;
    
    // Проверяем коллизию только если есть движение (намеренное или по инерции)
    if (currentMoveDir !== 0) {
        collisionDetected = checkCollisions(carContainer, trackModel, carCenterHeight, currentMoveDir);
    }

    // 3. Реакция на коллизию
    if (collisionDetected) {
        speed = 0;
        // Отталкиваем машину чуть назад от препятствия
        if (currentMoveDir > 0) carContainer.translateZ(-0.05);
        else if (currentMoveDir < 0) carContainer.translateZ(0.05);
        return; // Прерываем функцию, не применяем ускорение
    }

    // 4. Применение сил (если нет коллизии)
    if (keys.w) {
        speed += CAR_CONFIG.acceleration;
    } else if (keys.s) {
        if (speed > 0.002) speed -= CAR_CONFIG.brakeForce;
        else if (speed < -0.002) speed += CAR_CONFIG.brakeForce;
        else if (keys.s) speed -= CAR_CONFIG.acceleration * 0.5; // Разгон назад
    }

    // Ограничение скорости
    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;

    // Поворот
    if (Math.abs(speed) > 0.0005) {
        const dir = speed > 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }

    // Движение
    carContainer.translateZ(speed);
}

// Камера и свет
function updateCameraAndLight() {
    _v3LightPos.copy(carContainer.position).add(new THREE.Vector3(40, 100, 40));
    sunLight.position.copy(_v3LightPos);
    sunLight.target = carContainer;
    sunLight.target.updateMatrixWorld();

    _v3CameraOffset.set(0, CAMERA_CONFIG.height, -CAMERA_CONFIG.distance);
    _v3CameraOffset.applyMatrix4(carContainer.matrixWorld);
    
    // Немного увеличил lerpPosition для плавности на высокой скорости (было 0.1)
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);

    const targetLookAt = new THREE.Vector3(0, 0.5, 30);
    targetLookAt.applyMatrix4(carContainer.matrixWorld);
    _currentLookAt.lerp(targetLookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);
}

// Цикл анимации
function animate() {
    requestAnimationFrame(animate);
    
    updateCarPhysics();
    alignCarToTrack(carContainer, trackModel, carCenterHeight);
    updateCameraAndLight();
    updateUI(carContainer, speed);

    renderer.render(scene, camera);
}
animate();

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
