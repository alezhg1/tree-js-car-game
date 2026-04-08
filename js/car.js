import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Убрали TIME_CONFIG, чтобы не зависеть от него, зададим дальность явно

export function loadCar(scene, carContainer, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./scene.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.set(20, 20, 20);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const height = box.max.y - box.min.y;

        const carData = {
            centerHeight: height / 2,
            totalHeight: height
        };

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // --- ФАРЫ (Копия твоего кода с усилением) ---
        const createHeadlight = (xPos) => {
            const light = new THREE.SpotLight(0xffffff, 0);

            // Настройки из твоего файла (широкий луч, мягкие края)
            light.angle = Math.PI / 4;   // 45 градусов - широкий конус
            light.penumbra = 0.5;        // Мягкие края
            light.decay = 1.5;           // Реалистичное затухание
            light.distance = 120;        // Дальность

            // Тени от фар (обязательно для атмосферы)
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.bias = -0.0001;

            // Позиция: чуть ближе к машине, чтобы свет начинался сразу перед капотом
            light.position.set(xPos, 0.6, 0.8);
            light.target.position.set(xPos, 0, 30);

            return { light, target: light.target };
        };

        const leftSystem = createHeadlight(-0.4);
        const rightSystem = createHeadlight(0.4);

        carContainer.add(leftSystem.light);
        carContainer.add(leftSystem.target);
        carContainer.add(rightSystem.light);
        carContainer.add(rightSystem.target);

        carData.headlights = [leftSystem.light, rightSystem.light];

        carContainer.add(model);
        onLoaded(carData);
    }, undefined, (err) => console.error(err));
}