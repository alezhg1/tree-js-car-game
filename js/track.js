import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAR_CONFIG } from './config.js';

// --- ГЛОБАЛЬНЫЕ СТАТИЧЕСКИЕ ОБЪЕКТЫ (СОЗДАЮТСЯ 1 РАЗ) ---
// Это убирает нагрузку на сборщик мусора (Garbage Collector), который вызывает фризы на высокой скорости
const raycaster = new THREE.Raycaster();
const tempVector = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

export function loadTrack(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./track/scene.gltf', (gltf) => {
        const trackModel = gltf.scene;
        trackModel.scale.set(20, 20, 20);
        trackModel.updateMatrixWorld(true);

        // ОПТИМИЗАЦИЯ ТЕНЕЙ
        trackModel.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true; // Тени падают на дорогу
                child.castShadow = false;   // ОТКЛЮЧЕНО: Дорога/деревья не отбрасывают тени (главная причина лагов)
            }
        });

        scene.add(trackModel);
        onLoaded(trackModel);
    }, undefined, (err) => console.error(err));
}

export function alignCarToTrack(carContainer, trackModel, carCenterHeight) {
    if (!trackModel) return;

    // Используем глобальный tempVector
    tempVector.copy(carContainer.position);
    tempVector.y += (carCenterHeight * 0.5);

    raycaster.set(tempVector, new THREE.Vector3(0, -1, 0));
    
    // Оптимизация: intersectObjects быстрее, если передать массив, но intersectObject тоже ок для одного объекта
    const intersects = raycaster.intersectObject(trackModel, true);

    let foundGround = false;
    let groundY = carContainer.position.y;

    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance <= 2.5) {
            if (hit.point.y < carContainer.position.y) {
                groundY = hit.point.y + carCenterHeight - 0.05;
                foundGround = true;
            }
        }
    }

    if (foundGround) {
        carContainer.position.y = groundY;
    } else if (carContainer.position.y > 0) {
        carContainer.position.y -= 0.05;
    }

    // Зона палатки (оставляем как есть)
    const x = carContainer.position.x;
    const z = carContainer.position.z;
    if (x > 5 && x < 30 && z > 25 && z < 50) {
        if (carContainer.position.y > 1.5) carContainer.position.y = 1.5;
    }
}

/**
 * Оптимизированная проверка коллизий.
 * Проверяет ТОЛЬКО в направлении движения.
 * @param {THREE.Group} carContainer 
 * @param {THREE.Mesh} trackModel 
 * @param {number} carCenterHeight 
 * @param {number} moveDirection (1 = вперед, -1 = назад)
 * @returns {boolean}
 */
export function checkCollisions(carContainer, trackModel, carCenterHeight, moveDirection) {
    if (!trackModel) return false;

    // 1. Вычисляем точку старта луча (центр машины)
    tempVector.copy(carContainer.position);
    tempVector.y += carCenterHeight * 0.5;

    // 2. Вычисляем направление ТОЛЬКО ОДИН РАЗ
    // Берем локальное направление (0,0,1) и поворачиваем его на угол машины
    tempDirection.set(0, 0, 1);
    tempDirection.applyAxisAngle(upAxis, carContainer.rotation.y);

    // Если едем назад, разворачиваем луч
    if (moveDirection < 0) {
        tempDirection.negate();
    }

    // 3. Настраиваем луч
    raycaster.set(tempVector, tempDirection);

    // 4. Проверка
    const intersects = raycaster.intersectObject(trackModel, true);

    if (intersects.length > 0) {
        // Если ближайшее препятствие ближе чем дистанция безопасности
        if (intersects[0].distance < CAR_CONFIG.collisionDistance) {
            return true;
        }
    }

    return false;
}
