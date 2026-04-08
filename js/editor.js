import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class LevelEditor {
    constructor(scene, camera) {
        console.log(">>> [Editor] Инициализация...");
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        this.selectedObject = null;
        this.moveSpeed = 0.5;
        this.scaleSpeed = 0.05;
        this.objects = [];
        this.loader = new GLTFLoader();

        // Анимация
        this.mixer = null;
        this.activeAction = null;
        this.availableActions = {};

        // UI Элементы
        this.ui = {};

        this.createUI();
        console.log(">>> [Editor] Готов.");
    }

    createUI() {
        this.menu = document.createElement('div');
        this.menu.id = 'editor-menu';
        this.menu.style.cssText = 'position:absolute;left:0;top:50%;transform:translateY(-50%);width:340px;background:rgba(0,0,0,0.95);color:#fff;padding:20px;border-radius:0 10px 10px 0;display:none;font-family:monospace;z-index:1000;border:1px solid #0f0;box-shadow:0 0 15px rgba(0,255,0,0.3);max-height:85vh;overflow-y:auto;';

        this.menu.innerHTML = `
            <h3 style="margin-top:0;color:#0f0;border-bottom:1px solid #444;padding-bottom:10px;">РЕДАКТОР</h3>

            <!-- ПАНЕЛЬ АНИМАЦИИ -->
            <div id="anim-panel" style="background:#222; padding:10px; border:1px solid #444; margin-bottom:15px; border-radius:5px; display:none;">
                <label style="font-size:11px;color:#aaa;">АНИМАЦИЯ:</label>
                <select id="anim-select" style="width:100%; background:#000; color:#0f0; border:1px solid #555; padding:5px; margin-top:5px; font-family:monospace;">
                    <option value="">-- Нет анимации --</option>
                </select>
                <div style="margin-top:5px; display:flex; align-items:center; gap:10px;">
                    <label style="font-size:10px;">Скорость:</label>
                    <input type="range" id="anim-speed" min="0" max="3" step="0.1" value="1" style="flex:1;">
                    <span id="anim-speed-val" style="font-size:10px; width:30px;">1.0x</span>
                </div>
            </div>

            <div style="background:#222; padding:10px; border:1px solid #444; margin-bottom:15px; border-radius:5px;">
                <label style="font-size:11px;color:#aaa;">ПОЗИЦИЯ:</label>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <input type="number" id="inp-x" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="X">
                    <input type="number" id="inp-y" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="Y">
                    <input type="number" id="inp-z" step="0.1" style="width:33%; background:#000; color:#0f0; border:1px solid #555; padding:5px;" placeholder="Z">
                </div>
                <button id="apply-pos-btn" style="width:100%; margin-top:5px; background:#444; color:#fff; border:none; cursor:pointer; font-size:11px;">ПРИМЕНИТЬ</button>
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
                <b>Shift + Стрелки</b>: Двигать камеру
            </p>

            <label style="font-size:12px;display:block;margin-bottom:5px;">Спавн из папки:</label>
            <input type="text" id="asset-folder-name" value="windmill"
                style="width:90%;padding:8px;background:#222;border:1px solid #444;color:#0f0;font-family:monospace;margin-bottom:10px;">
            <button id="spawn-btn" style="width:100%;padding:10px;background:#0f0;color:#000;border:none;cursor:pointer;font-weight:bold;margin-bottom:10px;">🏮 СПАВН ОБЪЕКТА</button>

            <hr style="border:0;border-top:1px solid #444;margin:15px 0;">
            <button id="save-btn" style="width:100%;padding:10px;background:#0088ff;color:#fff;border:none;cursor:pointer;font-weight:bold;">💾 СОХРАНИТЬ JSON</button>
            <div id="status-msg" style="font-size:11px;color:#ffff00;margin-top:10px;min-height:15px;"></div>
        `;
        document.body.appendChild(this.menu);

        // --- СОХРАНЯЕМ ССЫЛКИ НА UI ЭЛЕМЕНТЫ ---
        this.ui.animPanel = document.getElementById('anim-panel');
        this.ui.animSelect = document.getElementById('anim-select');
        this.ui.animSpeedRange = document.getElementById('anim-speed');
        this.ui.animSpeedVal = document.getElementById('anim-speed-val');
        this.ui.inpX = document.getElementById('inp-x');
        this.ui.inpY = document.getElementById('inp-y');
        this.ui.inpZ = document.getElementById('inp-z');
        this.ui.inpS = document.getElementById('inp-s');

        if (!this.ui.animPanel || !this.ui.animSelect) {
            console.error("[Editor] КРИТИЧЕСКАЯ ОШИБКА: Не найдены элементы интерфейса!");
        }

        // --- ОБРАБОТЧИКИ ---
        this.ui.animSelect.addEventListener('change', (e) => {
            if (!this.selectedObject || !this.mixer) return;
            this.playAnimation(e.target.value);
        });

        this.ui.animSpeedRange.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.ui.animSpeedVal.innerText = speed.toFixed(1) + 'x';
            if (this.activeAction) {
                this.activeAction.timeScale = speed;
            }
            if (this.selectedObject) {
                this.selectedObject.userData.currentAnimSpeed = speed;
            }
        });

        const applyPosition = () => {
            if (!this.selectedObject) return;
            const x = parseFloat(this.ui.inpX.value);
            const y = parseFloat(this.ui.inpY.value);
            const z = parseFloat(this.ui.inpZ.value);
            if (!isNaN(x)) this.selectedObject.position.x = x;
            if (!isNaN(y)) this.selectedObject.position.y = y;
            if (!isNaN(z)) this.selectedObject.position.z = z;
            this.updateCoordsDisplay();
            this.showStatus("✅ Координаты применены");
        };

        const applyScale = () => {
            if (!this.selectedObject) return;
            const s = parseFloat(this.ui.inpS.value);
            if (!isNaN(s) && s > 0) {
                this.selectedObject.scale.set(s, s, s);
                this.updateCoordsDisplay();
                this.showStatus("✅ Размер изменен");
            }
        };

        document.getElementById('apply-pos-btn').onclick = applyPosition;
        document.getElementById('apply-scale-btn').onclick = applyScale;

        [this.ui.inpX, this.ui.inpY, this.ui.inpZ].forEach(inp =>
            inp.addEventListener('keydown', (e) => { if(e.key==='Enter') applyPosition(); })
        );
        this.ui.inpS.addEventListener('keydown', (e) => { if(e.key==='Enter') applyScale(); });

        const spawnBtn = document.getElementById('spawn-btn');
        const input = document.getElementById('asset-folder-name');
        spawnBtn.onclick = () => {
            const folder = input.value.trim();
            if (!folder) { this.showStatus("⚠️ Введи имя!"); return; }
            this.showStatus(`Загрузка: assets/${folder}...`);
            this.spawnAsset(folder);
        };

        document.getElementById('save-btn').onclick = () => this.saveToJSON();

        this.coordsDiv = document.createElement('div');
        this.coordsDiv.style.cssText = 'position:absolute;bottom:20px;right:20px;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border:2px solid #0f0;display:none;font-family:monospace;z-index:1000;';
        this.coordsDiv.innerHTML = 'Объект не выбран';
        document.body.appendChild(this.coordsDiv);
    }

    showStatus(msg) {
        const el = document.getElementById('status-msg');
        if(el) {
            el.innerText = msg;
            setTimeout(() => el.innerText = "", 2000);
        }
    }

    toggle() {
        this.isActive = !this.isActive;
        if (this.menu) this.menu.style.display = this.isActive ? 'block' : 'none';

        console.log("%c[EDITOR] " + (this.isActive ? "ВКЛ" : "ВЫКЛ"), "color: cyan; font-weight: bold;");

        if (!this.isActive) {
            this.selectedObject = null;
            if (this.coordsDiv) this.coordsDiv.style.display = 'none';
            this.stopAnimation();
        } else if (this.selectedObject) {
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

            // Масштабирование
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

            // Текстуры
            model.traverse((child) => {
                if (child.isMesh) {
                    const oldMat = child.material;
                    const newMat = new THREE.MeshBasicMaterial({
                        map: oldMat.map ? oldMat.map : null,
                        color: oldMat.color ? oldMat.color : 0xffffff,
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        side: oldMat.side || THREE.FrontSide,
                        fog: true
                    });
                    if (newMat.map) newMat.map.needsUpdate = true;
                    child.material = newMat;
                    if (oldMat !== newMat) oldMat.dispose();
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            // Анимации
            if (gltf.animations && gltf.animations.length > 0) {
                model.userData.animations = gltf.animations;
                console.log(`[Editor] ✅ Найдено анимаций: ${gltf.animations.length}`);
                gltf.animations.forEach((clip, i) => {
                    console.log(`   - #${i}: "${clip.name}"`);
                });
            }

            model.userData = { isEditable: true, type: folderName };
            this.scene.add(model);
            this.objects.push(model);
            this.selectObject(model);

            this.showStatus("✅ Создан!");

        }, undefined, (err) => {
            console.error("[Editor] ОШИБКА:", err);
            this.showStatus("❌ Ошибка загрузки");
        });
    }

    selectObject(object) {
        this.stopAnimation();

        // ЛОГИКА ПОИСКА РОДИТЕЛЯ С АНИМАЦИЕЙ
        let targetObj = object;

        // Если у текущего объекта нет анимаций, ищем у родителя
        if (!targetObj.userData.animations && targetObj.parent && targetObj.parent !== this.scene) {
            // Проверяем, является ли родитель редактируемым объектом
            if (targetObj.parent.userData.isEditable && targetObj.parent.userData.animations) {
                console.log("[Editor] Клик по детали, переключаемся на родителя для анимации.");
                targetObj = targetObj.parent;
            }
        }

        this.selectedObject = targetObj;

        if (this.selectedObject) {
            if (this.coordsDiv) this.coordsDiv.style.display = 'block';
            this.updateCoordsDisplay();
            this.setupAnimationPanel(this.selectedObject);
        } else {
            if (this.ui.animPanel) this.ui.animPanel.style.display = 'none';
        }
    }

    setupAnimationPanel(object) {
        if (!this.ui.animPanel || !this.ui.animSelect) return;

        const animations = object ? object.userData.animations : null;

        // Сброс
        this.ui.animPanel.style.display = 'none';
        this.ui.animSelect.innerHTML = '<option value="">-- Нет анимации --</option>';
        this.stopAnimation();
        this.mixer = null;
        this.availableActions = {};

        if (animations && animations.length > 0) {
            console.log("[Editor] Активация панели анимации...");
            this.ui.animPanel.style.display = 'block';

            animations.forEach((clip, index) => {
                const option = document.createElement('option');
                const name = clip.name || `Anim_${index}`;
                option.value = name;
                option.text = `${index + 1}. ${name} (${clip.duration.toFixed(1)}s)`;
                this.ui.animSelect.appendChild(option);
            });

            this.mixer = new THREE.AnimationMixer(object);
            this.availableActions = {};

            animations.forEach(clip => {
                const name = clip.name || `Anim_${animations.indexOf(clip)}`;
                this.availableActions[name] = this.mixer.clipAction(clip);
            });

            // Автозапуск
            const firstClip = animations[0];
            const firstName = firstClip.name || `Anim_0`;
            this.ui.animSelect.value = firstName;
            this.playAnimation(firstName);

            // Восстановление скорости
            const savedSpeed = object.userData.currentAnimSpeed || 1.0;
            this.ui.animSpeedRange.value = savedSpeed;
            this.ui.animSpeedVal.innerText = savedSpeed.toFixed(1) + 'x';
            if (this.activeAction) this.activeAction.timeScale = savedSpeed;

        } else {
            console.log("[Editor] Анимаций нет у этого объекта.");
        }
    }

    playAnimation(name) {
        if (!this.mixer || !name) {
            this.stopAnimation();
            return;
        }
        if (this.activeAction) this.activeAction.fadeOut(0.2);

        const action = this.availableActions[name];
        if (action) {
            action.reset();
            action.timeScale = parseFloat(this.ui.animSpeedRange.value);
            action.fadeIn(0.2);
            action.play();
            this.activeAction = action;
        }
    }

    stopAnimation() {
        if (this.activeAction) {
            this.activeAction.fadeOut(0.2);
            this.activeAction = null;
        }
    }

    updateAnimations(delta) {
        if (this.mixer) this.mixer.update(delta);
    }

    moveObject(keys) {
        // Управление через UI
    }

    updateCoordsDisplay() {
        if (!this.selectedObject || !this.coordsDiv) return;

        const p = this.selectedObject.position;
        const s = this.selectedObject.scale;

        this.coordsDiv.innerHTML = `<strong>${this.selectedObject.userData.type}</strong><br>X: ${p.x.toFixed(2)} | Y: ${p.y.toFixed(2)} | Z: ${p.z.toFixed(2)}`;

        if (this.ui.inpX && document.activeElement !== this.ui.inpX) this.ui.inpX.value = p.x.toFixed(3);
        if (this.ui.inpY && document.activeElement !== this.ui.inpY) this.ui.inpY.value = p.y.toFixed(3);
        if (this.ui.inpZ && document.activeElement !== this.ui.inpZ) this.ui.inpZ.value = p.z.toFixed(3);
        if (this.ui.inpS && document.activeElement !== this.ui.inpS) this.ui.inpS.value = s.x.toFixed(3);
    }

    onMouseClick(event) {
        if (!this.isActive || !this.camera) return;
        if (event.target.closest('#editor-menu')) return;

        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        for (let hit of intersects) {
            let obj = hit.object;

            // Поднимаемся вверх по иерархии, чтобы найти корневой редактируемый объект
            while(obj.parent && obj.parent !== this.scene) {
                if (obj.userData.isEditable) break;
                obj = obj.parent;
            }

            if (obj && obj.userData.isEditable) {
                this.selectObject(obj);
                return;
            }
        }
    }

    saveToJSON() {
        const data = this.objects.map(obj => {
            let activeAnim = "";
            let animSpeed = 1.0;

            if (obj === this.selectedObject && this.activeAction) {
                 Object.keys(this.availableActions).forEach(name => {
                     if (this.availableActions[name] === this.activeAction) {
                         activeAnim = name;
                         animSpeed = this.activeAction.timeScale;
                     }
                 });
            } else if (obj.userData.currentAnimName) {
                activeAnim = obj.userData.currentAnimName;
                animSpeed = obj.userData.currentAnimSpeed || 1.0;
            }

            return {
                file: obj.userData.type,
                position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                scale: obj.scale.x,
                animation: activeAnim,
                animSpeed: animSpeed
            };
        });

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'level_data.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showStatus("✅ JSON сохранен!");
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
                         const newMat = new THREE.MeshBasicMaterial({
                             map: oldMat.map ? oldMat.map : null,
                             color: oldMat.color ? oldMat.color : 0xffffff,
                             transparent: oldMat.transparent,
                             opacity: oldMat.opacity,
                             side: oldMat.side || THREE.FrontSide,
                             fog: true
                         });
                         if (newMat.map) newMat.map.needsUpdate = true;
                         child.material = newMat;
                         if (oldMat !== newMat) oldMat.dispose();
                         child.castShadow = false; child.receiveShadow = false;
                     }
                 });

                 if (gltf.animations && gltf.animations.length > 0) {
                     model.userData.animations = gltf.animations;
                     model.userData.currentAnimName = item.animation;
                     model.userData.currentAnimSpeed = item.animSpeed || 1.0;

                     const mixer = new THREE.AnimationMixer(model);
                     const actions = {};
                     gltf.animations.forEach(clip => {
                         actions[clip.name] = mixer.clipAction(clip);
                     });
                     if (item.animation && actions[item.animation]) {
                         const action = actions[item.animation];
                         action.timeScale = item.animSpeed || 1.0;
                         action.play();
                         model.userData.mixer = mixer;
                     }
                 }

                 model.userData.isEditable = true;
                 model.userData.type = item.file;
                 this.scene.add(model);
                 this.objects.push(model);
             });
        });
    }
}