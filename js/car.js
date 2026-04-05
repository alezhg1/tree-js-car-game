import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadCar(scene, carContainer, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./scene.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.set(20,20,20);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const height = box.max.y - box.min.y;

        // Возвращаем высоту для использования в других модулях
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

        carContainer.add(model);
        onLoaded(carData);
    }, undefined, (err) => console.error(err));
}