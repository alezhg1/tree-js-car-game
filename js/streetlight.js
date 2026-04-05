import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadStreetLight(scene, position, onLoaded) {
    const loader = new GLTFLoader();

    // МАСШТАБ МИРА: У тебя трасса и машина масштаба 20.
    // Фонарь должен быть такого же масштаба, чтобы 1 единица координат = 1 единице в мире.
    const WORLD_SCALE = 20.0;

    loader.load('./street_light/scene.gltf', (gltf) => {
        const model = gltf.scene;

        // --- ШАГ 1: ЦЕНТРИРОВАНИЕ (Как в машине) ---
        // Вычисляем границы модели
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const height = box.max.y - box.min.y;

        // Сдвигаем геометрию так, чтобы центр был по X/Z, а низ был по Y=0
        // Это гарантирует, что при установке position.x/y/z фонарь встанет именно туда, а не сбоку
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y; // Ставим на "землю" относительно своей модели

        // --- ШАГ 2: МАСШТАБИРОВАНИЕ ---
        // Теперь, когда модель отцентрована, масштабируем её
        model.scale.set(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);

        // --- ШАГ 3: УСТАНОВКА В МИР ---
        // Теперь координаты из режима разведки подойдут идеально
        model.position.add(position); // Добавляем целевые координаты к уже отцентрированной модели

        // Тени
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        console.log(`Фонарь установлен в: ${position.x}, ${position.y}, ${position.z}`);
        if (onLoaded) onLoaded();

    }, undefined, (err) => console.error('Ошибка загрузки фонаря:', err));
}