import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAR_CONFIG } from './config.js';

export function loadTrack(scene, onLoaded) {
    const loader = new GLTFLoader();
    loader.load('./track/scene.gltf', (gltf) => {
        const trackModel = gltf.scene;
        trackModel.scale.set(20, 20, 20);
        trackModel.updateMatrixWorld(true);

        trackModel.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });

        scene.add(trackModel);
        onLoaded(trackModel);
    }, undefined, (err) => console.error(err));
}

const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const carPosition = new THREE.Vector3();

export function alignCarToTrack(carContainer, trackModel, carCenterHeight) {
    if (!trackModel) return;

    const currentY = carContainer.position.y;
    carPosition.copy(carContainer.position);
    carPosition.y += (carCenterHeight * 0.5);

    raycaster.set(carPosition, downVector);
    const maxDistance = 2.5;
    const intersects = raycaster.intersectObject(trackModel, true);

    let foundGround = false;
    let groundY = currentY;

    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance <= maxDistance) {
            if (hit.point.y < currentY) {
                groundY = hit.point.y + carCenterHeight - 0.11;
                foundGround = true;
            }
        }
    }

    let calculatedY = currentY;
    if (foundGround) {
        calculatedY = groundY;
    } else {
        if (currentY > 0) calculatedY = currentY - 0.05;
    }

    const x = carContainer.position.x;
    const z = carContainer.position.z;
    if (x > 5 && x < 30 && z > 25 && z < 50) {
        const MAX_HEIGHT_IN_TENT = 1.5;
        if (calculatedY > MAX_HEIGHT_IN_TENT) calculatedY = MAX_HEIGHT_IN_TENT;
    }

    carContainer.position.y = calculatedY;
}

export function checkCollisions(carContainer, trackModel, carCenterHeight, moveDirection) {
    if (!trackModel) return false;

    const origin = carContainer.position.clone();
    origin.y += carCenterHeight * 0.5;

    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carContainer.rotation.y);
    if (moveDirection < 0) direction.negate();

    raycaster.set(origin, direction);
    const intersects = raycaster.intersectObject(trackModel, true);

    if (intersects.length > 0 && intersects[0].distance < CAR_CONFIG.collisionDistance) {
        return true;
    }
    return false;
}