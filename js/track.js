import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAR_CONFIG } from './config.js';

// --- ОПТИМИЗАЦИЯ: Переиспользуемые векторы ---
// Создаем их один раз при загрузке модуля, чтобы не мусорить память каждый кадр
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const carPosition = new THREE.Vector3();
const collisionOrigin = new THREE.Vector3();
const collisionDirection = new THREE.Vector3();
const rotationAxis = new THREE.Vector3(0, 1, 0);

export function loadTrack(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./track/scene.gltf', (gltf) => {
        const trackModel = gltf.scene;
        trackModel.scale.set(20, 20, 20);
        trackModel.updateMatrixWorld(true);

        // --- ОПТИМИЗАЦИЯ ТЕНЕЙ ---
        trackModel.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true;  // Тени ПАДАЮТ на объекты (машина будет отбрасывать тень на дорогу)
                child.castShadow = false;    // Тени ОТ объектов (деревьев/домов) ВЫКЛЮЧЕНЫ. 
                                             // Это дает огромный прирост FPS при движении камеры/света.
            }
        });

        scene.add(trackModel);
        onLoaded(trackModel);
    }, undefined, (err) => console.error(err));
}

export function alignCarToTrack(carContainer, trackModel, carCenterHeight) {
    if (!trackModel) return;

    const currentY = carContainer.position.y;
    
    // Используем глобальный вектор carPosition
    carPosition.copy(carContainer.position);
    carPosition.y += (carCenterHeight * 0.5);

    raycaster.set(carPosition, downVector);
    const maxDistance = 2.5;
    
    // intersectObject быстр, если геометрия не слишком сложная
    const intersects = raycaster.intersectObject(trackModel, true);

    let foundGround = false;
    let groundY = currentY;

    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance <= maxDistance) {
            if (hit.point.y < currentY) {
                groundY = hit.point.y + carCenterHeight - 0.05;
                foundGround = true;
            }
        }
    }

    let calculatedY = currentY;
    if (foundGround) {
        calculatedY = groundY;
    } else {
        if (currentY > 0) calculatedY = currentY - 0.05;
    }

    // Зона палатки (без изменений)
    const x = carContainer.position.x;
    const z = carContainer.position.z;
    if (x > 5 && x < 30 && z > 25 && z < 50) {
        const MAX_HEIGHT_IN_TENT = 1.5;
        if (calculatedY > MAX_HEIGHT_IN_TENT) calculatedY = MAX_HEIGHT_IN_TENT;
    }

    carContainer.position.y = calculatedY;
}

export function checkCollisions(carContainer, trackModel, carCenterHeight, moveDirection) {
    if (!trackModel) return false;

    // --- ОПТИМИЗАЦИЯ КОЛЛИЗИЙ ---
    // 1. Используем переиспользуемые векторы вместо создания новых
    collisionOrigin.copy(carContainer.position);
    collisionOrigin.y += carCenterHeight * 0.5;

    // 2. Вычисляем направление без лишних аллокаций
    // Берем направление вперед машины
    collisionDirection.set(0, 0, 1);
    collisionDirection.applyAxisAngle(rotationAxis, carContainer.rotation.y);

    // Если едем назад, инвертируем направление
    if (moveDirection < 0) {
        collisionDirection.negate();
    }

    raycaster.set(collisionOrigin, collisionDirection);

    // 3. Проверка пересечений
    const intersects = raycaster.intersectObject(trackModel, true);

    if (intersects.length > 0) {
        // Проверяем только первое пересечение (самое близкое)
        if (intersects[0].distance < CAR_CONFIG.collisionDistance) {
            return true;
        }
    }

    return false;
}
