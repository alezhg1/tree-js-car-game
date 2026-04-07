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
            totalHeight: height,
            headlights: [] // Сюда запишем фары
        };

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });

        // --- СОЗДАНИЕ ФАР ---
        // Левая фара
        const leftLight = new THREE.SpotLight(0xffffee, 0); // Яркость 0 изначально
        leftLight.angle = Math.PI / 6;
        leftLight.penumbra = 0.5;
        leftLight.decay = 2;
        leftLight.distance = 60; // Дальность света
        leftLight.position.set(-0.3, 0.5, 0.8); // Позиция относительно центра машины
        leftLight.target.position.set(-0.3, 0, 10); // Цель света

        // Правая фара
        const rightLight = leftLight.clone();
        rightLight.position.set(0.3, 0.5, 0.8);
        rightLight.target.position.set(0.3, 0, 10);

        // Добавляем фары и их цели в контейнер машины
        carContainer.add(leftLight);
        carContainer.add(leftLight.target);
        carContainer.add(rightLight);
        carContainer.add(rightLight.target);

        // Сохраняем ссылки для main.js
        carData.headlights = [leftLight, rightLight];
        // --------------------------

        carContainer.add(model);
        onLoaded(carData);
    }, undefined, (err) => console.error(err));
}