import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAR_CONFIG } from './config.js';

// ============================================================
// 🔥 ГЛОБАЛЬНЫЕ СТАТИЧЕСКИЕ ВЕКТОРЫ (Оптимизация памяти)
// ============================================================
const raycaster = new THREE.Raycaster();
const tempVec = new THREE.Vector3();
const downVector = new THREE.Vector3(0, -1, 0);

// Векторы для 3-х лучей коллизии
const dirCenter = new THREE.Vector3(0, 0, 1);
const dirLeft = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.26); // ~15 град влево
const dirRight = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.26);  // ~15 град вправо
const upAxis = new THREE.Vector3(0, 1, 0);
const collisionOrigin = new THREE.Vector3();

const GROUND_LEVEL_Y = 0.10;

export function loadTrack(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./track/scene.gltf', (gltf) => {
        const trackModel = gltf.scene;
        trackModel.scale.set(20, 20, 20);
        trackModel.updateMatrixWorld(true);

        // --- ОПТИМИЗАЦИЯ МАТЕРИАЛОВ С СОХРАНЕНИЕМ ТРАВЫ ---
        trackModel.traverse((child) => {
            if (child.isMesh) {
                const oldMat = child.material;

                // Проверяем, есть ли текстура (трава, асфальт, стены)
                const hasTexture = oldMat && oldMat.map;

                if (hasTexture) {
                    // Создаем БЫСТРЫЙ материал, но сохраняем текстуру
                    const newMat = new THREE.MeshBasicMaterial({
                        map: oldMat.map,           // <-- ГЛАВНОЕ: Берем текстуру травы
                        color: 0xffffff,           // Цвет не меняем (белый, чтобы текстура была яркой)
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        side: oldMat.side || THREE.FrontSide,
                        fog: true                  // Растворение в тумане
                    });

                    // Принудительно говорим текстуре, что она нужна
                    if (oldMat.map) {
                        oldMat.map.needsUpdate = true;
                    }

                    child.material = newMat;

                    // Очищаем старый тяжелый материал
                    if (oldMat !== newMat) {
                        // Не удаляем текстуру (oldMat.map), она нужна новому материалу!
                        // Удаляем только сам материал
                        oldMat.dispose();
                    }
                } else {
                    // Если текстуры нет (просто цвет), оставляем как есть, но выключаем тени
                    // Это спасает случаи, когда материал сложный и без текстуры
                }

                child.castShadow = false;
                child.receiveShadow = false;
            }
        });

        scene.add(trackModel);
        onLoaded(trackModel);
    }, undefined, (err) => console.error(err));
}

/**
 * Выравнивание по земле + Защита от проваливания
 */
export function alignCarToTrack(carContainer, trackModel, carCenterHeight) {
    if (!trackModel) return;

    const currentPos = carContainer.position;
    tempVec.copy(currentPos);
    tempVec.y += (carCenterHeight * 0.5);

    raycaster.set(tempVec, downVector);
    const intersects = raycaster.intersectObject(trackModel, true);

    let targetY = currentPos.y;
    let foundValidGround = false;

    if (intersects.length > 0) {
        const hit = intersects[0];
        // Если точка ниже -5, считаем это ошибкой (внутри объекта)
        if (hit.point.y > -5.0) {
            targetY = hit.point.y + carCenterHeight - 0.1;
            foundValidGround = true;
        }
    }

    if (!foundValidGround) {
        if (currentPos.y > GROUND_LEVEL_Y + 2.0) {
            targetY = currentPos.y - 0.5;
        } else {
            targetY = GROUND_LEVEL_Y + carCenterHeight - 0.1;
        }
    }

    if (Math.abs(targetY - currentPos.y) > 3.0) {
        carContainer.position.y = targetY;
    } else {
        carContainer.position.y += (targetY - currentPos.y) * 0.2;
    }
}

/**
 * 🔥 СУПЕР-БЫСТРАЯ ПРОВЕРКА КОЛЛИЗИЙ (3 ЛУЧА)
 */
export function checkCollisions(carContainer, trackModel, carCenterHeight) {
    if (!trackModel) return false;

    collisionOrigin.copy(carContainer.position);
    collisionOrigin.y += carCenterHeight * 0.4;

    const rotation = carContainer.rotation.y;

    // Луч 1: Центр
    tempVec.copy(dirCenter).applyAxisAngle(upAxis, rotation);
    raycaster.set(collisionOrigin, tempVec);
    if (checkIntersect(raycaster, trackModel)) return true;

    // Луч 2: Слева
    tempVec.copy(dirLeft).applyAxisAngle(upAxis, rotation);
    raycaster.set(collisionOrigin, tempVec);
    if (checkIntersect(raycaster, trackModel)) return true;

    // Луч 3: Справа
    tempVec.copy(dirRight).applyAxisAngle(upAxis, rotation);
    raycaster.set(collisionOrigin, tempVec);
    if (checkIntersect(raycaster, trackModel)) return true;

    return false;
}

function checkIntersect(localRaycaster, model) {
    const intersects = localRaycaster.intersectObject(model, true);
    return (intersects.length > 0 && intersects[0].distance < CAR_CONFIG.collisionDistance);
}