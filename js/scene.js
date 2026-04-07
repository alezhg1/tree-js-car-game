import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

let starField = null;

export function createScene() {
    const scene = new THREE.Scene();

    // Начальный цвет (день)
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 250);

    const camera = new THREE.PerspectiveCamera(75, 5 / 4, 0.1, 300);

    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1.0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    document.body.appendChild(renderer.domElement);

    // --- СВЕТ ---
    // Солнечный свет (Directional)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 100, 50);
    scene.add(sunLight);

    // Фоновый свет (Ambient) - будет менять яркость
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // --- ЗВЕЗДЫ (Простые точки) ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = TIME_CONFIG?.starCount || 1000;
    const posArray = new Float32Array(starCount * 3);

    for(let i = 0; i < starCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 400; // Разброс звезд
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0, // Изначально скрыты (день)
        fog: false
    });

    starField = new THREE.Points(starGeo, starMat);
    starField.position.y = 50; // Чуть выше
    scene.add(starField);

    return { scene, camera, renderer, sunLight, ambientLight };
}

/**
 * Обновляет время суток.
 * @param {number} elapsedTime - Время в секундах
 * @param {THREE.DirectionalLight} sunLight
 * @param {THREE.AmbientLight} ambientLight
 * @param {THREE.Scene} scene
 * @returns {boolean} true если ночь
 */
export function updateDayNightCycle(elapsedTime, sunLight, ambientLight, scene) {
    const dayDuration = TIME_CONFIG?.dayDuration || 60;
    const nightDuration = TIME_CONFIG?.nightDuration || 60;
    const totalCycle = dayDuration + nightDuration;

    // Текущее время в цикле
    const time = elapsedTime % totalCycle;
    const isNight = time > dayDuration;

    // Целевые значения
    let targetSkyColor, targetFogColor, targetSunInt, targetAmbInt, targetStarOpacity;

    if (isNight) {
        // НОЧЬ
        targetSkyColor = new THREE.Color(0x050510); // Темно-синий/черный
        targetFogColor = new THREE.Color(0x050510);
        targetSunInt = 0.2; // Тусклое "лунное" освещение
        targetAmbInt = 0.1; // Темнота
        targetStarOpacity = 1.0;
    } else {
        // ДЕНЬ
        targetSkyColor = new THREE.Color(0x87CEEB); // Голубой
        targetFogColor = new THREE.Color(0x87CEEB);
        targetSunInt = 1.5; // Яркое солнце
        targetAmbInt = 0.8; // Яркий фон
        targetStarOpacity = 0.0;
    }

    // Плавная интерполяция (Lerp) цветов и значений
    scene.background.lerp(targetSkyColor, 0.02);
    scene.fog.color.lerp(targetFogColor, 0.02);

    sunLight.intensity += (targetSunInt - sunLight.intensity) * 0.02;
    ambientLight.intensity += (targetAmbInt - ambientLight.intensity) * 0.02;

    if (starField) {
        starField.material.opacity += (targetStarOpacity - starField.material.opacity) * 0.02;
    }

    return isNight;
}