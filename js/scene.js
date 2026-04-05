import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

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
    const totalCycle = TIME_CONFIG.dayDuration + TIME_CONFIG.nightDuration;
    const normalizedTime = (timeInSeconds % totalCycle) / totalCycle;

    const isDay = normalizedTime < 0.5;

    let sunIntensity, ambientIntensity, skyColor, fogColor;

    if (isDay) {
        // ДЕНЬ
        sunIntensity = 1.8;
        ambientIntensity = 0.6;
        skyColor = new THREE.Color(0x87CEEB); // Ярко-голубой
        fogColor = new THREE.Color(0x87CEEB);

        // Теплый свет солнца днем
        sunLight.color.setHex(0xffffee);
        hemiLight.color.setHex(0x87CEEB);
        hemiLight.groundColor.setHex(0x333333);
    } else {
        // НОЧЬ
        sunIntensity = 0.0; // Солнце не светит ночью (только луна, если бы мы её добавили отдельно)
        ambientIntensity = 0.05; // Очень темно
        skyColor = new THREE.Color(0x020205); // Почти черный
        fogColor = new THREE.Color(0x020205);

        // Холодный лунный оттенок (опционально, можно сделать sunLight слабым синим)
        sunLight.color.setHex(0x444466);
        hemiLight.color.setHex(0x101020);
        hemiLight.groundColor.setHex(0x050505);
    }

    // Плавная интерполяция (Lerp) для мягкого перехода
    sunLight.intensity += (sunIntensity - sunLight.intensity) * 0.02;
    ambientLight.intensity += (ambientIntensity - ambientLight.intensity) * 0.02;

    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.lerp(fogColor, 0.02);
    // Туман тоже должен менять цвет плавно

    return !isDay; // Возвращаем true, если ночь
}