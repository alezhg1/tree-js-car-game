import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

let starField = null;
let skySphere = null;
let sunMesh = null;
let moonMesh = null;
const textureLoader = new THREE.TextureLoader();

// Ссылки на текстуры
const TEXTURES = {
    earthDay: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    moon: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'
};

export function createScene() {
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 600);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- 1. ЗВЕЗДЫ ---
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starVertices = [];
    const count = TIME_CONFIG?.starCount || 5000;
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        if (y < 0) continue;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- 2. НЕБО (СФЕРА ДНЯ) ---
    const skyGeometry = new THREE.SphereGeometry(900, 32, 32);
    const dayTexture = textureLoader.load(TEXTURES.earthDay);
    const dayMaterial = new THREE.MeshBasicMaterial({
        map: dayTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1
    });
    skySphere = new THREE.Mesh(skyGeometry, dayMaterial);
    // Поднимаем сферу неба чуть выше, чтобы горизонт был красивее
    skySphere.position.y = 50;
    scene.add(skySphere);

    // --- 3. ЛУНА (ОТДЕЛЬНЫЙ ОБЪЕКТ) ---
    const moonGeometry = new THREE.SphereGeometry(15, 32, 32); // Чуть меньше размером
    const moonTexture = textureLoader.load(TEXTURES.moon);
    const moonMaterial = new THREE.MeshBasicMaterial({
        map: moonTexture,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0 // Изначально скрыта
        // Убрали emissive, так как MeshBasicMaterial и так яркий
    });

    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    // СТАРТОВАЯ ПОЗИЦИЯ: Высоко в небе
    moonMesh.position.set(0, 150, -200);
    scene.add(moonMesh);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffee, 1.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;

    const shadowSize = 80;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x333333, 0.4);
    scene.add(hemiLight);

    return { scene, camera, renderer, sunLight, ambientLight, hemiLight };
}

export function updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, timeInSeconds) {
    const dayDur = TIME_CONFIG?.dayDuration || 180;
    const nightDur = TIME_CONFIG?.nightDuration || 180;
    const totalCycle = dayDur + nightDur;
    const normalizedTime = (timeInSeconds % totalCycle) / totalCycle;

    const isDay = normalizedTime < 0.5;

    let sunIntensity, ambientIntensity, skyColor, fogColor, starOpacity;
    let skyOpacity, moonOpacity;

    if (isDay) {
        // ДЕНЬ
        sunIntensity = 1.8;
        ambientIntensity = 0.6;
        skyColor = new THREE.Color(0x87CEEB);
        fogColor = new THREE.Color(0x87CEEB);

        starOpacity = 0;
        skyOpacity = 1;   // Небо видно
        moonOpacity = 0;  // Луна скрыта

        sunLight.color.setHex(0xffffee);
        hemiLight.color.setHex(0x87CEEB);
        hemiLight.groundColor.setHex(0x333333);

        // Вращаем небо, имитируя движение солнца
        if(skySphere) skySphere.rotation.y = timeInSeconds * 0.05;

    } else {
        // НОЧЬ
        sunIntensity = 0.1;
        ambientIntensity = 0.05;
        skyColor = new THREE.Color(0x050510);
        fogColor = new THREE.Color(0x050510);

        starOpacity = 1;
        skyOpacity = 0.1; // Дневное небо почти исчезает
        moonOpacity = 1;  // Луна видна

        sunLight.color.setHex(0xaaaaaa);
        hemiLight.color.setHex(0x101020);
        hemiLight.groundColor.setHex(0x050505);

        // Движение Луны по небу (медленное вращение и покачивание)
        if(moonMesh) {
            moonMesh.rotation.y += 0.002;
            // Луна ходит по дуге высоко в небе
            const moonAngle = timeInSeconds * 0.05;
            moonMesh.position.x = Math.sin(moonAngle) * 200;
            moonMesh.position.z = Math.cos(moonAngle) * 200;
            moonMesh.position.y = 150 + Math.sin(moonAngle * 2) * 30; // Высоко над горизонтом
        }
    }

    // Плавные переходы
    sunLight.intensity += (sunIntensity - sunLight.intensity) * 0.02;
    ambientLight.intensity += (ambientIntensity - ambientLight.intensity) * 0.02;

    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.lerp(fogColor, 0.02);

    if (starField) {
        starField.material.opacity += (starOpacity - starField.material.opacity) * 0.02;
    }
    if (skySphere) {
        skySphere.material.opacity += (skyOpacity - skySphere.material.opacity) * 0.02;
    }
    if (moonMesh) {
        moonMesh.material.opacity += (moonOpacity - moonMesh.material.opacity) * 0.02;
    }

    return !isDay;
}