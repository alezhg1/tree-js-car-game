import * as THREE from 'three';
import { createScene, updateDayNightCycle } from './scene.js';
import { loadTrack, alignCarToTrack } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG, TIME_CONFIG } from './config.js';
import Stats from 'three/addons/libs/stats.module.js';

// --- ИНИЦИАЛИЗАЦИЯ СЧЕТЧИКА FPS ---
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.position = 'absolute';
stats.dom.style.left = '0px';
stats.dom.style.top = '0px';
stats.dom.style.zIndex = '9999';
stats.dom.style.opacity = '0.8';

// --- ИНИЦИАЛИЗАЦИЯ ЧАСОВ ---
const clockDiv = document.createElement('div');
clockDiv.id = 'game-clock';
clockDiv.style.position = 'absolute';
clockDiv.style.top = '10px';
clockDiv.style.left = '50%';
clockDiv.style.transform = 'translateX(-50%)'; // Центрирование
clockDiv.style.color = '#ffffff';
clockDiv.style.fontSize = '32px';
clockDiv.style.fontFamily = '"Courier New", Courier, monospace'; // Моноширинный шрифт
clockDiv.style.fontWeight = 'bold';
clockDiv.style.textShadow = '2px 2px 4px #000000'; // Тень для читаемости
clockDiv.style.zIndex = '9999';
clockDiv.style.pointerEvents = 'none'; // Чтобы клики проходили сквозь часы
clockDiv.innerText = '00:00';
document.body.appendChild(clockDiv);
// ------------------------------

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
    if (keys.w) speed += CAR_CONFIG.acceleration;
    else if (keys.s) {
        if (speed > 0) speed -= CAR_CONFIG.brakeForce;
        else if (speed < 0) speed += CAR_CONFIG.brakeForce;
        else speed -= CAR_CONFIG.acceleration * 0.5;
    } else {
        speed *= CAR_CONFIG.friction;
    }

    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;
    if (Math.abs(speed) < 0.0001) speed = 0;

    if (Math.abs(speed) > 0.0001) {
        const dir = speed >= 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }

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

// Функция обновления часов
function updateClock(elapsedTime) {
    const dayDur = TIME_CONFIG.dayDuration;
    const nightDur = TIME_CONFIG.nightDuration;
    const totalCycle = dayDur + nightDur;

    // Время внутри текущего цикла (в секундах)
    let timeInCycle = elapsedTime % totalCycle;

    // Переводим игровые секунды в "часы" (0-6 часов за полный цикл)
    // 3 мин день + 3 мин ночь = 6 игровых часов
    // Коэффициент: 6 часов / totalCycle секунд
    const gameHoursTotal = 6;
    const gameTimeInHours = (timeInCycle / totalCycle) * gameHoursTotal;

    const hours = Math.floor(gameTimeInHours);
    const minutesFraction = gameTimeInHours - hours;
    const minutes = Math.floor(minutesFraction * 60);

    // Форматирование с ведущим нулем (03:05)
    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');

    clockDiv.innerText = `${hStr}:${mStr}`;
}

let elapsedTime = 0;
const clock = new THREE.Clock();

function animate() {
    stats.begin();

    const delta = clock.getDelta();
    elapsedTime += delta;

    const isNight = updateDayNightCycle(elapsedTime, sunLight, ambientLight, scene);

    // Обновляем часы каждый кадр
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