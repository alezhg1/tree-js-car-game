import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const tempVec = new THREE.Vector3();
const downVector = new THREE.Vector3(0, -1, 0);
const raycaster = new THREE.Raycaster();

const GROUND_LEVEL_Y = 0.10;

export function loadTrack(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./track/scene.gltf', (gltf) => {
        const trackModel = gltf.scene;
        trackModel.scale.set(20, 20, 20);
        trackModel.updateMatrixWorld(true);

        // ОПТИМИЗАЦИЯ С СОХРАНЕНИЕМ ТЕКСТУР
        trackModel.traverse((child) => {
            if (child.isMesh) {
                const oldMat = child.material;

                // Создаем новый быстрый материал, но ПЕРЕНОСИМ в него текстуру и цвет
                const newMat = new THREE.MeshBasicMaterial({
                    // Если была текстура (трава, кирпичи), переносим её
                    map: oldMat.map ? oldMat.map : null,

                    // Если текстуры нет, берем цвет
                    color: oldMat.color ? oldMat.color : 0xffffff,

                    // Важно для прозрачности (если есть окна или листва)
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    side: oldMat.side || THREE.FrontSide,

                    fog: true // Чтобы объекты растворялись в тумане
                });

                child.material = newMat;

                // Отключаем тени для производительности
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });

        scene.add(trackModel);
        onLoaded(trackModel);
    }, undefined, (err) => console.error(err));
}

/**
 * Выравнивание машины с защитой от проваливания
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

        // Проверка: если точка ниже -5, считаем это ошибкой (внутри объекта)
        if (hit.point.y > -5.0) {
            targetY = hit.point.y + carCenterHeight - 0.1;
            foundValidGround = true;
        }
    }

    if (!foundValidGround) {
        // Если мы высоко - падаем
        if (currentPos.y > GROUND_LEVEL_Y + 2.0) {
            targetY = currentPos.y - 0.5;
        }
        // Если низко или под землей - телепорт на уровень дороги
        else {
            targetY = GROUND_LEVEL_Y + carCenterHeight - 0.1;
        }
    }

    // Плавное или резкое изменение Y
    if (Math.abs(targetY - currentPos.y) > 3.0) {
        carContainer.position.y = targetY;
    } else {
        carContainer.position.y += (targetY - currentPos.y) * 0.2;
    }
}

export function checkCollisions() {
    return false;
}