import * as THREE from 'three';
import { createScene, updateDayNightCycle, updateRain } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { LevelEditor } from './editor.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG, TIME_CONFIG } from './config.js';
import Stats from 'three/addons/libs/stats.module.js';

// --- UI & STATS ---
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.cssText = 'position:absolute;left:0px;top:0px;z-index:9999;opacity:0.8;';

const clockDiv = document.createElement('div');
clockDiv.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:32px;font-family:"Courier New",monospace;font-weight:bold;text-shadow:2px 2px 4px #000;z-index:9999;pointer-events:none;';
clockDiv.innerText = '00:00';
document.body.appendChild(clockDiv);

let speed = 0, trackModel = null, carCenterHeight = 0, assetsLoaded = 0;
const totalAssets = 2;
let headlights = [];
let isRaining = false;
let isScoutMode = false;
let isEditorMode = false;

let cameraAngleH = 0, cameraAngleV = 0.5;
let scoutRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const scoutKeys = { w:false, s:false, a:false, d:false, ArrowUp:false, ArrowDown:false };
const scoutPosition = new THREE.Vector3();

const keys = { w:false, a:false, s:false, d:false, ArrowLeft:false, ArrowRight:false, ArrowUp:false, ArrowDown:false, shiftKey:false, ctrlKey:false };
const _v3CameraOffset = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

const { scene, camera, renderer, sunLight, ambientLight, hemiLight } = createScene();
const carContainer = new THREE.Group();
scene.add(carContainer);

let editor;

function checkLoading() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        document.getElementById('loading').style.display = 'none';
        editor = new LevelEditor(scene, camera);

        fetch('./level_data.json')
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => editor.loadFromJSON(data))
            .catch(() => {});

        if (TELEPORT_TO_TENT) {
            carContainer.position.set(TARGET_POS.x, TARGET_POS.y, TARGET_POS.z);
            carContainer.rotation.y = Math.PI;
            _currentLookAt.set(0, 0.5, 0).applyMatrix4(carContainer.matrixWorld);
            speed = 0;
        } else {
            alignCarToTrack(carContainer, trackModel, carCenterHeight);
        }
        scoutPosition.copy(camera.position);
        setupInputs();
        console.log("✅ Игра готова! Нажми 9 для редактора.");
    }
}

loadTrack(scene, (model) => { trackModel = model; checkLoading(); });
loadCar(scene, carContainer, (carData) => {
    carCenterHeight = carData.centerHeight;
    headlights = carData.headlights || [];
    checkLoading();
});

function setupInputs() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === '9') {
            isEditorMode = editor.toggle();
            if (isEditorMode) {
                isScoutMode = true;
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
        if ((k === 'p' || k === 'з') && !isEditorMode) {
            isScoutMode = !isScoutMode;
            if (isScoutMode) {
                scoutPosition.copy(camera.position);
                scoutRotation.setFromQuaternion(camera.quaternion);
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
                camera.lookAt(_currentLookAt);
            }
            return;
        }
        if (k === '0') { isRaining = !isRaining; return; }

        if (isScoutMode) {
            if (k==='w'||k==='ц') scoutKeys.w=true;
            if (k==='s'||k==='ы') scoutKeys.s=true;
            if (k==='a'||k==='ф') scoutKeys.a=true;
            if (k==='d'||k==='в') scoutKeys.d=true;
            if (e.key==='ArrowUp') scoutKeys.ArrowUp=true;
            if (e.key==='ArrowDown') scoutKeys.ArrowDown=true;
        } else {
            if (k==='w'||k==='ц') keys.w=true;
            if (k==='s'||k==='ы') keys.s=true;
            if (k==='a'||k==='ф') keys.a=true;
            if (k==='d'||k==='в') keys.d=true;
        }
        if (e.key==='ArrowLeft') keys.ArrowLeft=true;
        if (e.key==='ArrowRight') keys.ArrowRight=true;
        if (e.key==='ArrowUp') keys.ArrowUp=true;
        if (e.key==='ArrowDown') keys.ArrowDown=true;
        if (e.key==='Shift') keys.shiftKey=true;
        if (e.key==='Control') keys.ctrlKey=true;
    });

    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (isScoutMode) {
            if (k==='w'||k==='ц') scoutKeys.w=false;
            if (k==='s'||k==='ы') scoutKeys.s=false;
            if (k==='a'||k==='ф') scoutKeys.a=false;
            if (k==='d'||k==='в') scoutKeys.d=false;
            if (e.key==='ArrowUp') scoutKeys.ArrowUp=false;
            if (e.key==='ArrowDown') scoutKeys.ArrowDown=false;
        } else {
            if (k==='w'||k==='ц') keys.w=false;
            if (k==='s'||k==='ы') keys.s=false;
            if (k==='a'||k==='ф') keys.a=false;
            if (k==='d'||k==='в') keys.d=false;
        }
        if (e.key==='ArrowLeft') keys.ArrowLeft=false;
        if (e.key==='ArrowRight') keys.ArrowRight=false;
        if (e.key==='ArrowUp') keys.ArrowUp=false;
        if (e.key==='ArrowDown') keys.ArrowDown=false;
        if (e.key==='Shift') keys.shiftKey=false;
        if (e.key==='Control') keys.ctrlKey=false;
    });

    document.addEventListener('mousemove', (e) => {
        if (isScoutMode && document.pointerLockElement === document.body) {
            scoutRotation.y -= e.movementX * 0.002;
            scoutRotation.x -= e.movementY * 0.002;
            scoutRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, scoutRotation.x));
            camera.rotation.copy(scoutRotation);
        }
    });

    window.addEventListener('click', (e) => {
        if (isEditorMode) editor.onMouseClick(e);
    });

    window.addEventListener('resize', () => {
        camera.aspect = 5/4;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateCarPhysics() {
    if (isScoutMode) return;
    let acc = 0;
    if (keys.w) acc = CAR_CONFIG.acceleration;
    else if (keys.s) {
        if (speed > 0) acc = -CAR_CONFIG.brakeForce;
        else if (speed < 0) acc = CAR_CONFIG.brakeForce;
        else acc = -CAR_CONFIG.acceleration * 0.5;
    } else {
        speed *= CAR_CONFIG.friction;
    }
    if (acc !== 0) speed += acc;
    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;
    if (Math.abs(speed) < 0.0001) speed = 0;

    if (Math.abs(speed) > 0.0001) {
        const dir = speed >= 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }

    let collision = false;
    if (Math.abs(speed) > 0.001) collision = checkCollisions(carContainer, trackModel, carCenterHeight);
    if (collision) { speed = 0; carContainer.translateZ(-0.05); return; }
    carContainer.translateZ(speed);
}

function updateScout() {
    if (!isScoutMode) return;
    const spd = 0.1;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y=0; dir.normalize();
    const right = new THREE.Vector3(); right.crossVectors(camera.up, dir).normalize();
    if (scoutKeys.w) scoutPosition.addScaledVector(dir, spd);
    if (scoutKeys.s) scoutPosition.addScaledVector(dir, -spd);
    if (scoutKeys.a) scoutPosition.addScaledVector(right, spd);
    if (scoutKeys.d) scoutPosition.addScaledVector(right, -spd);
    if (scoutKeys.ArrowUp) scoutPosition.y += spd;
    if (scoutKeys.ArrowDown) scoutPosition.y -= spd;
    camera.position.copy(scoutPosition);
}

function updateCamera() {
    if (isScoutMode) return;
    const rotSpd = 0.04;
    if (keys.ArrowLeft) cameraAngleH += rotSpd;
    if (keys.ArrowRight) cameraAngleH -= rotSpd;
    if (keys.ArrowUp) cameraAngleV = Math.min(cameraAngleV + rotSpd, 1.2);
    if (keys.ArrowDown) cameraAngleV = Math.max(cameraAngleV - rotSpd, 0.1);

    const dist = CAMERA_CONFIG.distance;
    const hOff = Math.sin(cameraAngleV) * dist;
    const hDist = Math.cos(cameraAngleV) * dist;
    const totalAngle = carContainer.rotation.y + cameraAngleH;

    const offX = Math.sin(totalAngle) * hDist;
    const offZ = Math.cos(totalAngle) * hDist;
    const offY = hOff + CAMERA_CONFIG.height;

    _v3CameraOffset.set(carContainer.position.x - offX, carContainer.position.y + offY, carContainer.position.z - offZ);
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);

    const lookAt = new THREE.Vector3(0, 0.5, 30).applyMatrix4(carContainer.matrixWorld);
    _currentLookAt.lerp(lookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);

    // Свет следует за машиной
    sunLight.position.copy(carContainer.position).add(new THREE.Vector3(40, 100, 40));
    sunLight.target = carContainer;
    sunLight.target.updateMatrixWorld();
}

function updateClock(elapsedTime) {
    const total = (TIME_CONFIG?.dayDuration || 180) + (TIME_CONFIG?.nightDuration || 180);
    const t = (elapsedTime % total) / total * 6;
    const h = Math.floor(t);
    const m = Math.floor((t - h) * 60);
    clockDiv.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}

// --- ANIMATION LOOP ---
let elapsedTime = 0;
const clock = new THREE.Clock();
const targetFPS = 60;
const frameDuration = 1000 / targetFPS;
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    if (deltaTime < frameDuration) return;
    lastTime = currentTime - (deltaTime % frameDuration);

    stats.begin();
    const delta = clock.getDelta();
    elapsedTime += delta;

    // 1. Цикл дня/ночи и дождь
    const isNight = updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, elapsedTime, isRaining);
    updateRain(camera);
    updateClock(elapsedTime);

    // 2. Фары (ЯРКИЕ, НО КОРОТКИЕ)
    // Яркость 25 достаточно для короткой дистанции (35)
    const targetInt = isNight ? 25.0 : 0.0;
    headlights.forEach(l => l.intensity += (targetInt - l.intensity) * 0.05);

    // 3. Логика режимов
    if (isScoutMode) {
        updateScout();
    } else {
        updateCarPhysics();
        alignCarToTrack(carContainer, trackModel, carCenterHeight);
        updateCamera();
        updateUI(carContainer, speed);
    }

    // 4. Редактор
    if (isEditorMode) {
        editor.moveObject(keys);
        editor.updateAnimations(delta);
    }
    if (editor && editor.objects) {
        editor.objects.forEach(obj => {
            if (obj.userData.mixer) obj.userData.mixer.update(delta);
        });
    }

    renderer.render(scene, camera);
    stats.end();
}

console.log("🔄 Запуск...");
animate();