import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadStreetLight(scene, position, onLoaded) {
    const loader = new GLTFLoader();

    // НАСТРОЙКА РАЗМЕРА
    // Машина у тебя масштаба 20.
    // Если модель фонаря сделана в реальных размерах (метры), ставь 1.0.
    // Если она кажется огромной, попробуй 0.5. Если маленькой — 2.0.
    const LAMP_SCALE = 1.0;

    loader.load('./street_light/scene.gltf', (gltf) => {
        const model = gltf.scene;

        // Позиция
        model.position.copy(position);

        // Масштаб
        model.scale.set(LAMP_SCALE, LAMP_SCALE, LAMP_SCALE);

        // Тени
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        if (onLoaded) onLoaded();

    }, undefined, (err) => console.error('Ошибка загрузки фонаря:', err));
}