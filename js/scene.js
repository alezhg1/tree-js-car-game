import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

let starField = null;
let rainSystem = null;
let rainVelocity = []; // Скорость каждой капли
let rainAudio = null;  // Объект звука
let isAudioInitialized = false;

// Настройки дождя
const RAIN_COUNT = 20000; // Много капель для реализма, но оптимизировано
const RAIN_AREA_SIZE = 200; // Область дождя вокруг камеры

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

    // --- ЗВЕЗДЫ ---
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff, size: 1.5, transparent: true, opacity: 0,
        sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const starVertices = [];
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = Math.random() * 1000;
        const z = (Math.random() - 0.5) * 2000;
        if (y < 50) continue;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- ОПТИМИЗИРОВАННЫЙ ДОЖДЬ ---
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = [];
    rainVelocity = [];

    for (let i = 0; i < RAIN_COUNT; i++) {
        // Распределяем капли в большом кубе вокруг центра (0,0,0)
        rainPositions.push(
            (Math.random() - 0.5) * RAIN_AREA_SIZE,
            Math.random() * 100, // Высота от 0 до 100
            (Math.random() - 0.5) * RAIN_AREA_SIZE
        );
        // Разная скорость для эффекта глубины (параллакс)
        rainVelocity.push(0.5 + Math.random() * 0.5);
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));

    // Материал дождя: тонкие полоски
    const rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.4, // Чуть крупнее для видимости
        transparent: true,
        opacity: 0, // Скрыт по умолчанию
        blending: THREE.AdditiveBlending,
        depthWrite: false, // Важно для прозрачности
        sizeAttenuation: true // Капли уменьшаются вдали
    });

    rainSystem = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainSystem);

    // --- СВЕТ ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffee, 1.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
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

// Инициализация звука (вызывается при первом клике пользователя)
export function initRainAudio(listener) {
    if (isAudioInitialized) return;

    const audioLoader = new THREE.AudioLoader();
    // Путь к файлу: убедись, что rain.wav лежит в папке assets/ рядом с index.html
    audioLoader.load('./assets/rain.wav', function(buffer) {
        rainAudio = new THREE.Audio(listener);
        rainAudio.setBuffer(buffer);
        rainAudio.setLoop(true); // Зацикливаем
        rainAudio.setVolume(0);  // Начинаем с тишины

        // 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ 🔥
        // Браузеры требуют явного возобновления контекста после жеста пользователя
        if (listener.context.state === 'suspended') {
            listener.context.resume().then(() => {
                console.log("🔊 AudioContext resumed successfully");
                rainAudio.play();
            }).catch(err => {
                console.error("❌ Failed to resume AudioContext:", err);
            });
        } else {
            // Если контекст уже активен (редко, но бывает)
            rainAudio.play();
        }

        console.log("✅ Звук дождя загружен и готов.");
    }, undefined, (err) => {
        console.warn("⚠️ Не удалось загрузить rain.wav. Проверьте путь ./assets/rain.wav", err);
    });

    isAudioInitialized = true;
}

// Обновление физики дождя
export function updateRain(camera, isRaining) {
    if (!rainSystem) return;

    const positions = rainSystem.geometry.attributes.position.array;

    // Двигаем каждую каплю
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= rainVelocity[i / 3]; // Движение вниз

        // Если капля упала ниже 0, телепортируем её наверх
        if (positions[i + 1] < 0) {
            positions[i + 1] = 100;
            // Немного рандомизируем X и Z при респауне, чтобы не было паттернов
            positions[i] = (Math.random() - 0.5) * RAIN_AREA_SIZE;
            positions[i + 2] = (Math.random() - 0.5) * RAIN_AREA_SIZE;
        }
    }

    rainSystem.geometry.attributes.position.needsUpdate = true;

    // Дождь следует за камерой по X и Z, создавая эффект локального ливня
    rainSystem.position.x = camera.position.x;
    rainSystem.position.z = camera.position.z;
    // Y оставляем 0, так как капли сами падают сверху

    // Плавное изменение прозрачности
    const targetOpacity = isRaining ? 0.9 : 0.0;
    rainSystem.material.opacity += (targetOpacity - rainSystem.material.opacity) * 0.05;

    // Управление громкостью звука
    if (rainAudio) {
        const targetVolume = isRaining ? 0.3 : 0.0;
        // Очень плавное затухание/нарастание (0.01)
        rainAudio.setVolume(rainAudio.getVolume() + (targetVolume - rainAudio.getVolume()) * 0.01);
    }
}

export function updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, timeInSeconds, isRaining) {
    const dayDur = TIME_CONFIG?.dayDuration || 180;
    const nightDur = TIME_CONFIG?.nightDuration || 180;
    const totalCycle = dayDur + nightDur;
    const normalizedTime = (timeInSeconds % totalCycle) / totalCycle;
    const isDay = normalizedTime < 0.5;

    let sunIntensity, ambientIntensity, skyColor, fogColor, starOpacity;

    if (isDay) {
        sunIntensity = isRaining ? 0.8 : 1.8;
        ambientIntensity = isRaining ? 0.4 : 0.6;
        skyColor = isRaining ? new THREE.Color(0x555566) : new THREE.Color(0x87CEEB);
        fogColor = skyColor;
        starOpacity = 0;
        hemiLight.color.setHex(isRaining ? 0x555566 : 0x87CEEB);
        sunLight.color.setHex(0xffffee);
    } else {
        // НОЧЬ: ПОЛНАЯ ТЬМА
        sunIntensity = 0.0;
        ambientIntensity = 0.0;
        skyColor = new THREE.Color(0x000000);
        fogColor = new THREE.Color(0x000000);
        starOpacity = isRaining ? 0.0 : 0.8;
        hemiLight.color.setHex(0x000000);
        sunLight.color.setHex(0x000000);
    }

    sunLight.intensity += (sunIntensity - sunLight.intensity) * 0.02;
    ambientLight.intensity += (ambientIntensity - ambientLight.intensity) * 0.02;

    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.lerp(fogColor, 0.02);

    // Туман ночью очень густой
    const targetFogNear = isDay ? (isRaining ? 50 : 100) : 2;
    const targetFogFar = isDay ? (isRaining ? 300 : 600) : 20;

    scene.fog.near += (targetFogNear - scene.fog.near) * 0.02;
    scene.fog.far += (targetFogFar - scene.fog.far) * 0.02;

    if (starField) starField.material.opacity += (starOpacity - starField.material.opacity) * 0.02;

    return !isDay;
}