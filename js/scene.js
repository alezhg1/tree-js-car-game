import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

let starField = null;

export function createScene() {
    const scene = new THREE.Scene();

    // Начальный цвет (день)
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

    // --- СОЗДАНИЕ ЗВЕЗД (УЛУЧШЕННОЕ) ---
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,          // Увеличили размер звезд (было 0.5)
        transparent: true,
        opacity: 0,         // Изначально скрыты
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending, // Режим наложения для яркого свечения
        depthWrite: false   // Чтобы звезды не перекрывали друг друга странно
    });

    const starVertices = [];
    // Используем значение из конфига, если нет - по умолчанию 5000
    const count = typeof TIME_CONFIG !== 'undefined' && TIME_CONFIG.starCount ? TIME_CONFIG.starCount : 5000;

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;

        // Оставляем звезды только в верхней полусфере (над головой)
        if (y < 0) continue;

        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    // -----------------------

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
    // Проверка на случай, если конфиг еще не загружен или переменная недоступна в этом контексте
    const dayDur = (typeof TIME_CONFIG !== 'undefined' && TIME_CONFIG.dayDuration) ? TIME_CONFIG.dayDuration : 180;
    const nightDur = (typeof TIME_CONFIG !== 'undefined' && TIME_CONFIG.nightDuration) ? TIME_CONFIG.nightDuration : 180;

    const totalCycle = dayDur + nightDur;
    const normalizedTime = (timeInSeconds % totalCycle) / totalCycle;

    const isDay = normalizedTime < 0.5;

    let sunIntensity, ambientIntensity, skyColor, fogColor, starOpacity;

    if (isDay) {
        // ДЕНЬ
        sunIntensity = 1.8;
        ambientIntensity = 0.6;
        skyColor = new THREE.Color(0x87CEEB);
        fogColor = new THREE.Color(0x87CEEB);
        starOpacity = 0; // Звезды скрыты

        sunLight.color.setHex(0xffffee);
        hemiLight.color.setHex(0x87CEEB);
        hemiLight.groundColor.setHex(0x333333);
    } else {
        // НОЧЬ
        sunIntensity = 0.0;
        ambientIntensity = 0.05;
        skyColor = new THREE.Color(0x020205);
        fogColor = new THREE.Color(0x020205);
        starOpacity = 1; // Звезды максимально видны

        sunLight.color.setHex(0x444466);
        hemiLight.color.setHex(0x101020);
        hemiLight.groundColor.setHex(0x050505);
    }

    // Плавные переходы
    sunLight.intensity += (sunIntensity - sunLight.intensity) * 0.02;
    ambientLight.intensity += (ambientIntensity - ambientLight.intensity) * 0.02;

    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.lerp(fogColor, 0.02);

    // Анимация прозрачности звезд
    if (starField) {
        starField.material.opacity += (starOpacity - starField.material.opacity) * 0.02;
    }

    return !isDay;
}