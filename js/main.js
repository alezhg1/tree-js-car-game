import * as THREE from 'three';
import { createScene, updateDayNightCycle } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG, TIME_CONFIG } from './config.js';
import Stats from 'three/addons/libs/stats.module.js';

// --- FPS METER ---
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.cssText = 'position:absolute;left:0px;top:0px;z-index:9999;opacity:0.8;';

// --- CLOCK UI ---
const clockDiv = document.createElement('div');
clockDiv.id = 'game-clock';
clockDiv.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:32px;font-family:"Courier New",monospace;font-weight:bold;text-shadow:2px 2px 4px #000;z-index:9999;pointer-events:none;';
clockDiv.innerText = '00:00';
document.body.appendChild(clockDiv);

let speed = 0;
let trackModel = null;
let carCenterHeight = 0;
let assetsLoaded = 0;
const totalAssets = 2;
let headlights = [];

const keys = { w: false, a: false, s: false, d: false };
const _v3CameraOffset = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

const { scene, camera, renderer, sunLight, ambientLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

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
    // 1. Расчет желаемой скорости
    let desiredAcceleration = 0;
    if (keys.w) desiredAcceleration = CAR_CONFIG.acceleration;
    else if (keys.s) {
        if (speed > 0) desiredAcceleration = -CAR_CONFIG.brakeForce;
        else if (speed < 0) desiredAcceleration = CAR_CONFIG.brakeForce;
        else desiredAcceleration = -CAR_CONFIG.acceleration * 0.5;
    } else {
        speed *= CAR_CONFIG.friction;
    }

    if (desiredAcceleration !== 0) {
        speed += desiredAcceleration;
    }

    // Ограничения скорости
    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;
    if (Math.abs(speed) < 0.0001) speed = 0;

    // 2. ПОВОРОТЫ
    if (Math.abs(speed) > 0.0001) {
        const dir = speed >= 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }

    // 3. 🔥 ПРОВЕРКА КОЛЛИЗИЙ (ТОЛЬКО ЕСЛИ ЕСТЬ ДВИЖЕНИЕ)
    // Это критически важно для производительности!
    let collision = false;
    if (Math.abs(speed) > 0.001) {
        // Определяем направление для логики отталкивания (упрощенно считаем вперед)
        collision = checkCollisions(carContainer, trackModel, carCenterHeight);
    }

    if (collision) {
        // МГНОВЕННАЯ ОСТАНОВКА И ОТТАЛКИВАНИЕ
        speed = 0;
        // Чуть отъезжаем назад, чтобы не застрять в текстуре
        carContainer.translateZ(-0.05);
        // Прерываем функцию, чтобы не применять движение вперед
        return;
    }

    // 4. ПРИМЕНЕНИЕ ДВИЖЕНИЯ
    carContainer.translateZ(speed);
}

function updateCamera() {
    _v3CameraOffset.set(0, CAMERA_CONFIG.height, -CAMERA_CONFIG.distance);
    _v3CameraOffset.applyMatrix4(carContainer.matrixWorld);
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);

    const targetLookAt = new THREE.Vector3(0, 0.5, 30);
    targetLookAt.applyMatrix4(carContainer.matrixWorld);
    _currentLookAt.lerp(targetLookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);
}

function updateClock(elapsedTime) {
    const dayDur = TIME_CONFIG.dayDuration;
    const nightDur = TIME_CONFIG.nightDuration;
    const totalCycle = dayDur + nightDur;
    let timeInCycle = elapsedTime % totalCycle;
    const gameHoursTotal = 6;
    const gameTimeInHours = (timeInCycle / totalCycle) * gameHoursTotal;
    const hours = Math.floor(gameTimeInHours);
    const minutes = Math.floor((gameTimeInHours - hours) * 60);
    clockDiv.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

let elapsedTime = 0;
const clock = new THREE.Clock();

function animate() {
    stats.begin();

    const delta = clock.getDelta();
    elapsedTime += delta;

    const isNight = updateDayNightCycle(elapsedTime, sunLight, ambientLight, scene);
    updateClock(elapsedTime);

    const targetHeadlightIntensity = isNight ? 5.0 : 0.0;
    headlights.forEach(light => {
        light.intensity += (targetHeadlightIntensity - light.intensity) * 0.05;
    });

    updateCarPhysics();
    alignCarToTrack(carContainer, trackModel, carCenterHeight);
    updateCamera();
    updateUI(carContainer, speed);

    renderer.render(scene, camera);

    stats.end();

    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 0);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = 5 / 4;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});