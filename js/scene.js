import * as THREE from 'three';
import { TIME_CONFIG } from './config.js';

let starField = null;
let skySphere = null;
let moonMesh = null;
let rainSystem = null;
let rainVelocity = [];
const textureLoader = new THREE.TextureLoader();

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

    // --- ЗВЕЗДЫ ---
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff, size: 1.5, transparent: true, opacity: 0,
        sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
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

    // --- НЕБО (СОЛНЦЕ/ДЕНЬ) ---
    const skyGeometry = new THREE.SphereGeometry(900, 32, 32);
    const dayTexture = textureLoader.load(TEXTURES.earthDay);
    const dayMaterial = new THREE.MeshBasicMaterial({ map: dayTexture, side: THREE.BackSide, transparent: true, opacity: 1 });
    skySphere = new THREE.Mesh(skyGeometry, dayMaterial);
    skySphere.position.y = 50;
    scene.add(skySphere);

    // --- ЛУНА ---
    const moonGeometry = new THREE.SphereGeometry(15, 32, 32);
    const moonTexture = textureLoader.load(TEXTURES.moon);
    const moonMaterial = new THREE.MeshBasicMaterial({ map: moonTexture, side: THREE.FrontSide, transparent: true, opacity: 0 });
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.set(0, 150, -200);
    scene.add(moonMesh);

    // --- ДОЖДЬ ---
    const rainCount = 15000;
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = [];
    for (let i = 0; i < rainCount; i++) {
        rainPositions.push((Math.random() - 0.5) * 200, Math.random() * 100, (Math.random() - 0.5) * 200);
        rainVelocity.push(0.5 + Math.random() * 0.5);
    }
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa, size: 0.2, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    rainSystem = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainSystem);

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

export function updateRain(camera) {
    if (!rainSystem) return;
    const positions = rainSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= rainVelocity[i / 3];
        if (positions[i + 1] < 0) {
            positions[i + 1] = 100;
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 2] = (Math.random() - 0.5) * 200;
        }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;
    rainSystem.position.x = camera.position.x;
    rainSystem.position.z = camera.position.z;
}

export function updateDayNightCycle(sunLight, ambientLight, hemiLight, scene, timeInSeconds, isRaining) {
    const dayDur = TIME_CONFIG?.dayDuration || 60;
    const nightDur = TIME_CONFIG?.nightDuration || 180;
    const totalCycle = dayDur + nightDur;
    const normalizedTime = (timeInSeconds % totalCycle) / totalCycle;
    const isDay = normalizedTime < 0.5;

    let sunIntensity, ambientIntensity, skyColor, fogColor, starOpacity, skyOpacity, moonOpacity;
    let rainOpacity = isRaining ? 0.8 : 0.0;

    if (isDay) {
        sunIntensity = isRaining ? 0.8 : 1.8;
        ambientIntensity = isRaining ? 0.4 : 0.6;
        skyColor = isRaining ? new THREE.Color(0x555566) : new THREE.Color(0x87CEEB);
        fogColor = isRaining ? new THREE.Color(0x555566) : new THREE.Color(0x87CEEB);
        starOpacity = 0;
        skyOpacity = isRaining ? 0.6 : 1.0;
        moonOpacity = 0;
        hemiLight.color.setHex(isRaining ? 0x555566 : 0x87CEEB);
        sunLight.color.setHex(0xffffee);
        if(skySphere) skySphere.rotation.y = timeInSeconds * 0.05;
    } else {
        sunIntensity = 0.1;
        ambientIntensity = 0.05;
        skyColor = new THREE.Color(0x050510);
        fogColor = new THREE.Color(0x050510);
        starOpacity = isRaining ? 0.1 : 1.0;
        skyOpacity = 0.1;
        moonOpacity = isRaining ? 0.3 : 1.0;
        sunLight.color.setHex(0xaaaaaa);
        hemiLight.color.setHex(0x101020);
        hemiLight.groundColor.setHex(0x050505);
        if(moonMesh) {
            moonMesh.rotation.y += 0.002;
            const moonAngle = timeInSeconds * 0.05;
            moonMesh.position.x = Math.sin(moonAngle) * 200;
            moonMesh.position.z = Math.cos(moonAngle) * 200;
            moonMesh.position.y = 150 + Math.sin(moonAngle * 2) * 30;
        }
    }

    sunLight.intensity += (sunIntensity - sunLight.intensity) * 0.02;
    ambientLight.intensity += (ambientIntensity - ambientLight.intensity) * 0.02;
    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.lerp(fogColor, 0.02);

    const targetFogNear = isRaining ? 50 : 100;
    const targetFogFar = isRaining ? 300 : 600;
    scene.fog.near += (targetFogNear - scene.fog.near) * 0.02;
    scene.fog.far += (targetFogFar - scene.fog.far) * 0.02;

    if (starField) starField.material.opacity += (starOpacity - starField.material.opacity) * 0.02;
    if (skySphere) skySphere.material.opacity += (skyOpacity - skySphere.material.opacity) * 0.02;
    if (moonMesh) moonMesh.material.opacity += (moonOpacity - moonMesh.material.opacity) * 0.02;
    if (rainSystem) rainSystem.material.opacity += (rainOpacity - rainSystem.material.opacity) * 0.05;

    return !isDay;
}