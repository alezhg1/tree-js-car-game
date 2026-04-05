import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TIME_CONFIG } from './config.js';

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

        // --- ФАРЫ ---
        const headlightLeft = new THREE.SpotLight(0xffffff, 0);
        headlightLeft.angle = Math.PI / 4; // Широкий луч (45 градусов)
        headlightLeft.penumbra = 0.5;      // Мягкие края
        headlightLeft.decay = 1.5;         // Меньше затухание для дальности
        headlightLeft.distance = TIME_CONFIG.headlightDistance;
        headlightLeft.castShadow = true;   // Фары тоже отбрасывают тени!
        headlightLeft.shadow.mapSize.width = 1024;
        headlightLeft.shadow.mapSize.height = 1024;

        // Позиция: слева спереди, чуть выше земли
        headlightLeft.position.set(-0.4, 0.6, 1.0);
        headlightLeft.target.position.set(-0.4, 0, 20);

        const headlightRight = headlightLeft.clone();
        headlightRight.position.set(0.4, 0.6, 1.0); // Справа спереди
        headlightRight.target.position.set(0.4, 0, 20);

        carContainer.add(headlightLeft);
        carContainer.add(headlightLeft.target);
        carContainer.add(headlightRight);
        carContainer.add(headlightRight.target);

        carData.headlights = [headlightLeft, headlightRight];

        carContainer.add(model);
        onLoaded(carData);
    }, undefined, (err) => console.error(err));
}