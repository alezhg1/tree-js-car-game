// ============================================================
// 0. ГРОМКИЙ СТАРТ
// ============================================================
console.error("%c!!! ГЛАВНЫЙ ФАЙЛ ЗАПУЩЕН !!!", "background: red; color: white; font-size: 20px; font-weight: bold;");

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene, updateDayNightCycle } from './scene.js';
import { loadTrack, alignCarToTrack, checkCollisions } from './track.js';
import { loadCar } from './car.js';
import { updateUI } from './ui.js';
import { TELEPORT_TO_TENT, TARGET_POS, CAR_CONFIG, CAMERA_CONFIG, TIME_CONFIG } from './config.js';
import Stats from 'three/addons/libs/stats.module.js';

console.log("✅ Шаг 1: Все импорты загружены.");



// ============================================================
// 1. КЛАСС РЕДАКТОРА (С ручным вводом координат)
// ============================================================
class LevelEditor {
    constructor(scene, camera) {
        console.log(">>> Инициализация редактора...");
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        this.selectedObject = null;
        this.moveSpeed = 0.5;
        this.scaleSpeed = 0.05;
        this.objects = [];
        this.loader = new GLTFLoader();
        this.createUI();
        console.log(">>> Редактор готов. Жду нажатия 9.");
    }

    createUI() {
        this.menu = document.createElement('div');
        this.menu.style.cssText = 'position:absolute;left:0;top:50%;transform:translateY(-50%);width:320px;background:rgba(0,0,0,0.95);color:#fff;padding:20px;border-radius:0 10px 10px 0;display:none;font-family:monospace;z-index:1000;border:1px solid #0f0;box-shadow:0 0 15px rgba(0,255,0,0.3);';
        
        // Добавили поля ввода координат прямо в HTML меню
        this.menu.innerHTML = `
            <h3 style="margin-top:0;color:#0f0;border-bottom:1px solid #444;padding-bottom:10px;">РЕДАКТОР</h3>
            
            <div style="background:#222; padding:10px; border:1px solid #444; margin-bottom:15px; border-radius:5px;">
                <label style="font-size:11px;color:#aaa;">ПОЗИЦИЯ ОБЪЕКТА:</label>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <input type="number" id="inp-x" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="X">
                    <input type="number" id="inp-y" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="Y">
                    <input type="number" id="inp-z" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="Z">
                </div>
                <button id="apply-pos-btn" style="width:100%; margin-top:5px; background:#444; color:#fff; border:none; cursor:pointer; font-size:11px;">ПРИМЕНИТЬ КООРДИНАТЫ</button>
            </div>

            <div style="background:#222; padding:10px; border:1px solid #444; margin-bottom:15px; border-radius:5px;">
                <label style="font-size:11px;color:#aaa;">РАЗМЕР (SCALE):</label>
                <div style="display:flex; gap:5px; margin-top:5px; align-items:center;">
                    <input type="number" id="inp-s" step="0.1" style="flex:1; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="Scale">
                    <button id="apply-scale-btn" style="background:#444; color:#fff; border:none; cursor:pointer; padding:5px 10px;">OK</button>
                </div>
            </div>

            <p style="font-size:11px;color:#aaa;margin-bottom:10px;">
                <b>Клик</b>: Выбрать объект<br>
                <b>Shift + Стрелки</b>: Двигать камеру (как раньше)
            </p>

            <label style="font-size:12px;display:block;margin-bottom:5px;">Спавн из папки:</label>
            <input type="text" id="asset-folder-name" value="street_light" 
                style="width:90%;padding:8px;background:#222;border:1px solid #444;color:#0f0;font-family:monospace;margin-bottom:10px;">
            <button id="spawn-btn" style="width:100%;padding:10px;background:#0f0;color:#000;border:none;cursor:pointer;font-weight:bold;margin-bottom:10px;">🏮 СПАВН ОБЪЕКТА</button>
            
            <hr style="border:0;border-top:1px solid #444;margin:15px 0;">
            <button id="save-btn" style="width:100%;padding:10px;background:#0088ff;color:#fff;border:none;cursor:pointer;font-weight:bold;">💾 СОХРАНИТЬ JSON</button>
            <div id="status-msg" style="font-size:11px;color:#ffff00;margin-top:10px;min-height:15px;"></div>
        `;
        document.body.appendChild(this.menu);

        // --- ЛОГИКА ПОЛЕЙ ВВОДА ---
        const inpX = document.getElementById('inp-x');
        const inpY = document.getElementById('inp-y');
        const inpZ = document.getElementById('inp-z');
        const inpS = document.getElementById('inp-s');
        const btnApplyPos = document.getElementById('apply-pos-btn');
        const btnApplyScale = document.getElementById('apply-scale-btn');

        // Функция применения координат из полей
        const applyPosition = () => {
            if (!this.selectedObject) return;
            const x = parseFloat(inpX.value);
            const y = parseFloat(inpY.value);
            const z = parseFloat(inpZ.value);
            if (!isNaN(x)) this.selectedObject.position.x = x;
            if (!isNaN(y)) this.selectedObject.position.y = y;
            if (!isNaN(z)) this.selectedObject.position.z = z;
            this.updateCoordsDisplay(); // Обновить отображение
            document.getElementById('status-msg').innerText = "✅ Координаты применены";
            setTimeout(() => document.getElementById('status-msg').innerText = "", 1500);
        };

        // Функция применения масштаба
        const applyScale = () => {
            if (!this.selectedObject) return;
            const s = parseFloat(inpS.value);
            if (!isNaN(s) && s > 0) {
                this.selectedObject.scale.set(s, s, s);
                this.updateCoordsDisplay();
                document.getElementById('status-msg').innerText = "✅ Размер изменен";
                setTimeout(() => document.getElementById('status-msg').innerText = "", 1500);
            }
        };

        btnApplyPos.onclick = applyPosition;
        btnApplyScale.onclick = applyScale;
        
        // Применение по Enter
        [inpX, inpY, inpZ].forEach(inp => inp.addEventListener('keydown', (e) => { if(e.key==='Enter') applyPosition(); }));
        inpS.addEventListener('keydown', (e) => { if(e.key==='Enter') applyScale(); });

        // --- КНОПКИ СПАВНА И СОХРАНЕНИЯ ---
        const spawnBtn = document.getElementById('spawn-btn');
        const input = document.getElementById('asset-folder-name');
        const status = document.getElementById('status-msg');
        
        spawnBtn.onclick = () => {
            const folder = input.value.trim();
            if (!folder) { status.innerText = "⚠️ Введи имя!"; return; }
            status.innerText = `Загрузка: assets/${folder}...`;
            this.spawnAsset(folder);
        };

        document.getElementById('save-btn').onclick = () => this.saveToJSON();

        this.coordsDiv = document.createElement('div');
        this.coordsDiv.style.cssText = 'position:absolute;bottom:20px;right:20px;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border:2px solid #0f0;display:none;font-family:monospace;z-index:1000;';
        this.coordsDiv.innerHTML = 'Объект не выбран';
        document.body.appendChild(this.coordsDiv);
        console.log(">>> UI Редактора создан.");
    }

    toggle() {
        this.isActive = !this.isActive;
        this.menu.style.display = this.isActive ? 'block' : 'none';
        console.log("%c[EDITOR] Переключатель: " + (this.isActive ? "ВКЛ" : "ВЫКЛ"), "color: cyan; font-weight: bold; font-size: 16px;");
        
        if (!this.isActive) {
            this.selectedObject = null;
            this.coordsDiv.style.display = 'none';
        } else if (this.selectedObject) {
            // Если включили редактор и объект уже выбран, обновим поля
            this.updateCoordsDisplay();
        }
        return this.isActive;
    }

    spawnAsset(folderName) {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const spawnPos = this.camera.position.clone().add(direction.multiplyScalar(10));
        const url = `./assets/${folderName}/scene.gltf`;
        
        this.loader.load(url, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            
            model.position.set(0,0,0); model.rotation.set(0,0,0); model.scale.set(1,1,1);
            
            let scaleFix = 1.0;
            if (size.y > 10) scaleFix = 3.0 / size.y;
            else if (size.y < 0.1) scaleFix = 2.0 / size.y;
            
            model.scale.set(scaleFix, scaleFix, scaleFix);
            model.updateMatrixWorld(true);
            
            const newBox = new THREE.Box3().setFromObject(model);
            const newCenter = newBox.getCenter(new THREE.Vector3());
            model.position.x -= newCenter.x;
            model.position.z -= newCenter.z;
            model.position.y -= newBox.min.y;
            model.updateMatrixWorld(true);
            
            model.scale.multiplyScalar(20.0);
            model.updateMatrixWorld(true);
            model.position.copy(spawnPos);
            
            model.traverse((child) => {
                if (child.isMesh) {
                    const oldMat = child.material;
                    if (oldMat && oldMat.map) {
                        child.material = new THREE.MeshBasicMaterial({
                            map: oldMat.map, transparent: oldMat.transparent, opacity: oldMat.opacity, fog: true
                        });
                        oldMat.dispose();
                    }
                    child.castShadow = false; child.receiveShadow = false;
                }
            });
            
            model.userData = { isEditable: true, type: folderName };
            this.scene.add(model);
            this.objects.push(model);
            this.selectObject(model);
            
            document.getElementById('status-msg').innerText = "✅ Создан!";
            setTimeout(() => document.getElementById('status-msg').innerText = "", 2000);
            
        }, undefined, (err) => {
            console.error("[Editor] ОШИБКА ЗАГРУЗКИ:", err);
            document.getElementById('status-msg').innerText = "❌ Ошибка";
        });
    }

    selectObject(object) {
        if (this.selectedObject) {
            this.selectedObject.traverse((c) => {
                if (c.isMesh && c.userData.origColor !== undefined) c.material.color.setHex(c.userData.origColor);
            });
        }
        this.selectedObject = object;
        if (this.selectedObject) {
            this.selectedObject.traverse((c) => {
                if (c.isMesh) {
                    if (c.userData.origColor === undefined) c.userData.origColor = c.material.color.getHex();
                    c.material.color.setHex(0x00ff00);
                }
            });
            this.coordsDiv.style.display = 'block';
            this.updateCoordsDisplay(); // Тут заполнятся поля ввода!
        }
    }

    // Убрали управление объектом с клавиатуры, оставили только камеру если нужно
    moveObject(keys) {
        // Теперь эта функция пустая или используется только для камеры, если ты хочешь
        // Но так как мы перешли на ручной ввод, клавиши для объекта больше не нужны.
        // Можно оставить управление камерой здесь, если нужно.
    }

    updateCoordsDisplay() {
        if (!this.selectedObject) {
            this.coordsDiv.innerHTML = 'Объект не выбран';
            // Очистить поля ввода
            document.getElementById('inp-x').value = '';
            document.getElementById('inp-y').value = '';
            document.getElementById('inp-z').value = '';
            document.getElementById('inp-s').value = '';
            return;
        }

        const p = this.selectedObject.position;
        const s = this.selectedObject.scale;

        // Обновляем правый нижний угол
        this.coordsDiv.innerHTML = `
            <strong>${this.selectedObject.userData.type}</strong><br>
            Выбран объект. Используйте поля слева.<br>
            X: ${p.x.toFixed(2)} | Y: ${p.y.toFixed(2)} | Z: ${p.z.toFixed(2)}
        `;

        // Заполняем поля ввода в меню текущими значениями
        // Делаем это аккуратно, чтобы не сбрасывать фокус, если пользователь уже печатает
        const inpX = document.getElementById('inp-x');
        const inpY = document.getElementById('inp-y');
        const inpZ = document.getElementById('inp-z');
        const inpS = document.getElementById('inp-s');

        if (document.activeElement !== inpX) inpX.value = p.x.toFixed(3);
        if (document.activeElement !== inpY) inpY.value = p.y.toFixed(3);
        if (document.activeElement !== inpZ) inpZ.value = p.z.toFixed(3);
        if (document.activeElement !== inpS) inpS.value = s.x.toFixed(3);
    }
    
    onMouseClick(event) {
        if (!this.isActive || !this.camera) return;
        // Не обрабатываем клик, если кликнули по самому меню редактора
        if (event.target.closest('#editor-menu')) return; // Нужно добавить ID меню или проверять иначе

        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        for (let hit of intersects) {
            let obj = hit.object;
            while(obj.parent && obj.parent !== this.scene) {
                if (obj.userData.isEditable) break;
                obj = obj.parent;
            }
            if (obj.userData.isEditable) {
                this.selectObject(obj);
                return;
            }
        }
    }
    
    saveToJSON() {
        const data = this.objects.map(obj => ({
            file: obj.userData.type,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            scale: obj.scale.x
        }));
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'level_data.json';
        a.click();
        URL.revokeObjectURL(url);
        document.getElementById('status-msg').innerText = "✅ JSON сохранен!";
    }
    
    loadFromJSON(dataArray) {
        if (!dataArray || dataArray.length === 0) return;
        console.log(`[Editor] Загрузка ${dataArray.length} объектов...`);
        dataArray.forEach(item => {
             this.loader.load(`./assets/${item.file}/scene.gltf`, (gltf) => {
                 const model = gltf.scene;
                 const box = new THREE.Box3().setFromObject(model);
                 const size = box.getSize(new THREE.Vector3());
                 model.position.set(0,0,0); model.rotation.set(0,0,0); model.scale.set(1,1,1);
                 let scaleFix = 1.0;
                 if (size.y > 10) scaleFix = 3.0 / size.y;
                 else if (size.y < 0.1) scaleFix = 2.0 / size.y;
                 model.scale.set(scaleFix, scaleFix, scaleFix).multiplyScalar(20.0);
                 model.updateMatrixWorld(true);
                 const newBox = new THREE.Box3().setFromObject(model);
                 const newCenter = newBox.getCenter(new THREE.Vector3());
                 model.position.x -= newCenter.x; model.position.z -= newCenter.z; model.position.y -= newBox.min.y;
                 
                 model.position.copy(item.position);
                 model.scale.set(item.scale, item.scale, item.scale);
                 
                 model.traverse((child) => {
                     if (child.isMesh) {
                         const oldMat = child.material;
                         if (oldMat && oldMat.map) {
                             child.material = new THREE.MeshBasicMaterial({ map: oldMat.map, transparent: oldMat.transparent, opacity: oldMat.opacity, fog: true });
                             oldMat.dispose();
                         }
                         child.castShadow = false; child.receiveShadow = false;
                     }
                 });
                 model.userData = { isEditable: true, type: item.file };
                 this.scene.add(model);
                 this.objects.push(model);
             });
        });
    }
}
console.log("✅ Шаг 2: Класс LevelEditor определен.");

// ============================================================
// 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И UI
// ============================================================
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.cssText = 'position:absolute;left:0px;top:0px;z-index:9999;opacity:0.8;';

const clockDiv = document.createElement('div');
clockDiv.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:32px;font-family:"Courier New",monospace;font-weight:bold;text-shadow:2px 2px 4px #000;z-index:9999;pointer-events:none;';
clockDiv.innerText = '00:00';
document.body.appendChild(clockDiv);

let speed = 0, trackModel = null, carCenterHeight = 0, assetsLoaded = 0;
const totalAssets = 2;
let headlights = [];
let isRaining = false, isScoutMode = false, isEditorMode = false;

let cameraAngleH = 0, cameraAngleV = 0.5;
let scoutRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const scoutKeys = { w:false, s:false, a:false, d:false, ArrowUp:false, ArrowDown:false };
const scoutPosition = new THREE.Vector3();

const keys = { w:false, a:false, s:false, d:false, ArrowLeft:false, ArrowRight:false, ArrowUp:false, ArrowDown:false, shiftKey:false, ctrlKey:false };
const _v3CameraOffset = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.5, 0);

console.log("✅ Шаг 3: Глобальные переменные созданы.");

// ============================================================
// 3. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ
// ============================================================
let scene, camera, renderer, sunLight, ambientLight, carContainer, editor;

try {
    const sceneData = createScene();
    scene = sceneData.scene;
    camera = sceneData.camera;
    renderer = sceneData.renderer;
    sunLight = sceneData.sunLight;
    ambientLight = sceneData.ambientLight;
    console.log("✅ Шаг 4: Сцена создана.");

    carContainer = new THREE.Group();
    scene.add(carContainer);

    // Создаем редактор
    editor = new LevelEditor(scene, camera);
    console.log("✅ Шаг 5: Экземпляр редактора создан.");

} catch (e) {
    console.error("❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ СОЗДАНИИ СЦЕНЫ:", e);
}

// ============================================================
// 4. ЗАГРУЗКА РЕСУРСОВ
// ============================================================
function checkLoading() {
    assetsLoaded++;
    console.log(`Загружено активов: ${assetsLoaded}/${totalAssets}`);
    
    if (assetsLoaded === totalAssets) {
        console.log("🎉 ВСЕ РЕСУРСЫ ЗАГРУЖЕНЫ!");
        document.getElementById('loading').style.display = 'none';
        
        // Попытка загрузить JSON уровня
        fetch('./level_data.json')
            .then(res => {
                if (!res.ok) throw new Error("Файл не найден");
                return res.json();
            })
            .then(data => {
                console.log("JSON найден, загружаем объекты...");
                editor.loadFromJSON(data);
            })
            .catch(err => {
                // Тихая ошибка, это нормально если файла нет
            });

        if (TELEPORT_TO_TENT) {
            carContainer.position.set(TARGET_POS.x, TARGET_POS.y, TARGET_POS.z);
            carContainer.rotation.y = Math.PI;
            _currentLookAt.set(0, 0.5, 0).applyMatrix4(carContainer.matrixWorld);
            speed = 0;
        } else {
            alignCarToTrack(carContainer, trackModel, carCenterHeight);
        }
        scoutPosition.copy(camera.position);
        
        console.log("🚀 НАВЕШИВАНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ...");
        setupInputs();
        console.log("✅ ГОТОВО! Игра запущена. Нажми 9 для редактора.");
    }
}

loadTrack(scene, (model) => { 
    console.log("Трек загружен.");
    trackModel = model; 
    checkLoading(); 
});

loadCar(scene, carContainer, (carData) => {
    console.log("Машина загружена.");
    carCenterHeight = carData.centerHeight;
    headlights = carData.headlights || [];
    checkLoading();
});

// ============================================================
// 5. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================
function setupInputs() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        
        // ПРОВЕРКА КНОПКИ 9
        if (k === '9') {
            console.error("%c[INPUT] КЛАВИША 9 НАЖАТА!", "background: yellow; color: black; font-size: 16px; font-weight: bold;");
            isEditorMode = editor.toggle();
            if (isEditorMode) {
                isScoutMode = true;
                scoutPosition.copy(camera.position);
                scoutRotation.setFromQuaternion(camera.quaternion);
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
                isScoutMode = false;
                camera.lookAt(_currentLookAt);
            }
            return;
        }

        if ((k === 'p' || k === 'з') && !isEditorMode) {
            isScoutMode = !isScoutMode;
            if (isScoutMode) {
                scoutPosition.copy(camera.position);
                scoutRotation.setFromQuaternion(camera.quaternion);
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
                camera.lookAt(_currentLookAt);
            }
            return;
        }

        if (k === '0') { isRaining = !isRaining; return; }

        if (isScoutMode) {
            if (k==='w'||k==='ц') scoutKeys.w=true;
            if (k==='s'||k==='ы') scoutKeys.s=true;
            if (k==='a'||k==='ф') scoutKeys.a=true;
            if (k==='d'||k==='в') scoutKeys.d=true;
            if (e.key==='ArrowUp') scoutKeys.ArrowUp=true;
            if (e.key==='ArrowDown') scoutKeys.ArrowDown=true;
        } else {
            if (k==='w'||k==='ц') keys.w=true;
            if (k==='s'||k==='ы') keys.s=true;
            if (k==='a'||k==='ф') keys.a=true;
            if (k==='d'||k==='в') keys.d=true;
        }
        
        if (e.key==='ArrowLeft') keys.ArrowLeft=true;
        if (e.key==='ArrowRight') keys.ArrowRight=true;
        if (e.key==='ArrowUp') keys.ArrowUp=true;
        if (e.key==='ArrowDown') keys.ArrowDown=true;
        if (e.key==='Shift') keys.shiftKey=true;
        if (e.key==='Control') keys.ctrlKey=true;
    });

    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (isScoutMode) {
            if (k==='w'||k==='ц') scoutKeys.w=false;
            if (k==='s'||k==='ы') scoutKeys.s=false;
            if (k==='a'||k==='ф') scoutKeys.a=false;
            if (k==='d'||k==='в') scoutKeys.d=false;
            if (e.key==='ArrowUp') scoutKeys.ArrowUp=false;
            if (e.key==='ArrowDown') scoutKeys.ArrowDown=false;
        } else {
            if (k==='w'||k==='ц') keys.w=false;
            if (k==='s'||k==='ы') keys.s=false;
            if (k==='a'||k==='ф') keys.a=false;
            if (k==='d'||k==='в') keys.d=false;
        }
        if (e.key==='ArrowLeft') keys.ArrowLeft=false;
        if (e.key==='ArrowRight') keys.ArrowRight=false;
        if (e.key==='ArrowUp') keys.ArrowUp=false;
        if (e.key==='ArrowDown') keys.ArrowDown=false;
        if (e.key==='Shift') keys.shiftKey=false;
        if (e.key==='Control') keys.ctrlKey=false;
    });

    document.addEventListener('mousemove', (e) => {
        if (isScoutMode && document.pointerLockElement === document.body) {
            scoutRotation.y -= e.movementX * 0.002;
            scoutRotation.x -= e.movementY * 0.002;
            scoutRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, scoutRotation.x));
            camera.rotation.copy(scoutRotation);
        }
    });

    window.addEventListener('click', (e) => {
        if (isEditorMode) editor.onMouseClick(e);
    });

    window.addEventListener('resize', () => {
        camera.aspect = 5/4;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ============================================================
// 6. ФИЗИКА И ЛОГИКА
// ============================================================
function updateCarPhysics() {
    if (isScoutMode) return;
    let acc = 0;
    if (keys.w) acc = CAR_CONFIG.acceleration;
    else if (keys.s) {
        if (speed > 0) acc = -CAR_CONFIG.brakeForce;
        else if (speed < 0) acc = CAR_CONFIG.brakeForce;
        else acc = -CAR_CONFIG.acceleration * 0.5;
    } else {
        speed *= CAR_CONFIG.friction;
    }
    if (acc !== 0) speed += acc;
    
    if (speed > CAR_CONFIG.maxSpeed) speed = CAR_CONFIG.maxSpeed;
    if (speed < -CAR_CONFIG.reverseSpeed) speed = -CAR_CONFIG.reverseSpeed;
    if (Math.abs(speed) < 0.0001) speed = 0;

    if (Math.abs(speed) > 0.0001) {
        const dir = speed >= 0 ? 1 : -1;
        if (keys.a) carContainer.rotation.y += CAR_CONFIG.turnSpeed * dir;
        if (keys.d) carContainer.rotation.y -= CAR_CONFIG.turnSpeed * dir;
    }

    let collision = false;
    if (Math.abs(speed) > 0.001) {
        collision = checkCollisions(carContainer, trackModel, carCenterHeight);
    }
    if (collision) {
        speed = 0;
        carContainer.translateZ(-0.05);
        return;
    }
    carContainer.translateZ(speed);
}

function updateScout() {
    if (!isScoutMode) return;
    const spd = 0.1;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y=0; dir.normalize();
    const right = new THREE.Vector3(); right.crossVectors(camera.up, dir).normalize();
    
    if (scoutKeys.w) scoutPosition.addScaledVector(dir, spd);
    if (scoutKeys.s) scoutPosition.addScaledVector(dir, -spd);
    if (scoutKeys.a) scoutPosition.addScaledVector(right, spd);
    if (scoutKeys.d) scoutPosition.addScaledVector(right, -spd);
    if (scoutKeys.ArrowUp) scoutPosition.y += spd;
    if (scoutKeys.ArrowDown) scoutPosition.y -= spd;
    camera.position.copy(scoutPosition);
}

function updateCamera() {
    if (isScoutMode) return;
    const rotSpd = 0.04;
    if (keys.ArrowLeft) cameraAngleH += rotSpd;
    if (keys.ArrowRight) cameraAngleH -= rotSpd;
    if (keys.ArrowUp) cameraAngleV = Math.min(cameraAngleV + rotSpd, 1.2);
    if (keys.ArrowDown) cameraAngleV = Math.max(cameraAngleV - rotSpd, 0.1);

    const dist = CAMERA_CONFIG.distance;
    const hOff = Math.sin(cameraAngleV) * dist;
    const hDist = Math.cos(cameraAngleV) * dist;
    const totalAngle = carContainer.rotation.y + cameraAngleH;
    
    const offX = Math.sin(totalAngle) * hDist;
    const offZ = Math.cos(totalAngle) * hDist;
    const offY = hOff + CAMERA_CONFIG.height;
    
    _v3CameraOffset.set(carContainer.position.x - offX, carContainer.position.y + offY, carContainer.position.z - offZ);
    camera.position.lerp(_v3CameraOffset, CAMERA_CONFIG.lerpPosition);
    
    const lookAt = new THREE.Vector3(0, 0.5, 30).applyMatrix4(carContainer.matrixWorld);
    _currentLookAt.lerp(lookAt, CAMERA_CONFIG.lerpLookAt);
    camera.lookAt(_currentLookAt);
}

function updateClock(elapsedTime) {
    const total = TIME_CONFIG.dayDuration + TIME_CONFIG.nightDuration;
    const t = (elapsedTime % total) / total * 6;
    const h = Math.floor(t);
    const m = Math.floor((t - h) * 60);
    clockDiv.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}

// ============================================================
// 7. ЦИКЛ АНИМАЦИИ
// ============================================================
let elapsedTime = 0;
const clock = new THREE.Clock();

function animate() {
    stats.begin();
    const delta = clock.getDelta();
    elapsedTime += delta;

    const isNight = updateDayNightCycle(elapsedTime, sunLight, ambientLight, scene);
    updateClock(elapsedTime);

    const targetInt = isNight ? 5.0 : 0.0;
    headlights.forEach(l => l.intensity += (targetInt - l.intensity) * 0.05);

    if (isScoutMode) {
        updateScout();
    } else {
        updateCarPhysics();
        alignCarToTrack(carContainer, trackModel, carCenterHeight);
        updateCamera();
        updateUI(carContainer, speed);
    }

    if (isEditorMode) editor.moveObject(keys);

    renderer.render(scene, camera);
    stats.end();
    
    // Хак для максимального FPS
    setTimeout(() => requestAnimationFrame(animate), 0);
}

console.log("🔄 Запуск цикла анимации...");
animate();
console.log("✅ Конец файла main.js достигнут.");