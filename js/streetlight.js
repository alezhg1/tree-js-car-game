import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadStreetLight(scene, position, onLoaded) {
    const loader = new GLTFLoader();

    // Загружаем модель из папки street_light
    loader.load('./street_light/scene.gltf', (gltf) => {
        const model = gltf.scene;

        // Устанавливаем позицию, которую передали из main.js
        model.position.copy(position);

        // Масштаб (можешь поменять, если фонарь слишком большой или маленький)
        model.scale.set(1, 1, 1);

        // Настройка теней для модели
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        // Сообщаем, что загрузка завершена
        if (onLoaded) onLoaded();

    }, undefined, (err) => console.error('Ошибка загрузки фонаря:', err));
}