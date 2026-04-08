import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

        // --- ФАРЫ (Настроены вниз и коротко) ---
        const createHeadlight = (xPos) => {
            const light = new THREE.SpotLight(0xffffff, 0);

            // Узкий и короткий луч, бьющий в землю
            light.angle = Math.PI / 5;   // Чуть уже (~36 градусов), чтобы было пятно, а не веер
            light.penumbra = 0.8;        // Очень мягкие края для реализма
            light.decay = 2.0;           // Сильное затухание (свет гаснет быстро)
            light.distance = 35;         // Короткая дистанция (было 120)

            // Тени от фар
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.bias = -0.0001;

            // ПОЗИЦИЯ: Ниже (0.4) и ближе к бамперу (0.7)
            light.position.set(xPos, 0.4, 0.7);

            // ЦЕЛЬ: Направлена ВНИЗ перед машиной (Y = -0.8), чтобы светить на асфальт
            light.target.position.set(xPos, -0.8, 15);

            return { light, target: light.target };
        };

        const leftSystem = createHeadlight(-0.35);
        const rightSystem = createHeadlight(0.35);

        carContainer.add(leftSystem.light);
        carContainer.add(leftSystem.target);
        carContainer.add(rightSystem.light);
        carContainer.add(rightSystem.target);

        carData.headlights = [leftSystem.light, rightSystem.light];

        carContainer.add(model);
        onLoaded(carData);
    }, undefined, (err) => console.error(err));
}