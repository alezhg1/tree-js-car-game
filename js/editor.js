import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class LevelEditor {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        this.selectedObject = null;
        this.moveSpeed = 0.5;

        this.createUI();
        this.loader = new GLTFLoader();
    }

    createUI() {
        this.menu = document.createElement('div');
        this.menu.style.position = 'absolute';
        this.menu.style.left = '0';
        this.menu.style.top = '50%';
        this.menu.style.transform = 'translateY(-50%)';
        this.menu.style.width = '280px';
        this.menu.style.background = 'rgba(0, 0, 0, 0.9)';
        this.menu.style.color = '#fff';
        this.menu.style.padding = '20px';
        this.menu.style.borderRadius = '0 10px 10px 0';
        this.menu.style.display = 'none';
        this.menu.style.fontFamily = 'monospace';
        this.menu.style.zIndex = '1000';
        this.menu.style.border = '1px solid #0f0';
        this.menu.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.2)';

        this.menu.innerHTML = `
            <h3 style="margin-top:0; color:#0f0; border-bottom:1px solid #444; padding-bottom:10px;">РЕДАКТОР</h3>
            <p style="font-size:11px; color:#aaa; margin-bottom:15px;">
                1. Введи имя папки в <code>assets/</code><br>
                2. Нажми "СПАВН"<br>
                3. <b>Shift + Стрелки</b>: Двигать<br>
                4. Клик: Выбрать (подсветка)
            </p>

            <label style="font-size:12px; display:block; margin-bottom:5px;">Папка ассета:</label>
            <input type="text" id="asset-folder-name" value="lamp_post"
                style="width:90%; padding:8px; background:#222; border:1px solid #444; color:#0f0; font-family:monospace; margin-bottom:10px;">

            <button id="spawn-btn" style="width:100%; padding:12px; background:#0f0; color:#000; border:none; cursor:pointer; font-weight:bold; font-size:14px; margin-bottom:10px;">
                🏮 СПАВН ОБЪЕКТА
            </button>

            <div id="status-msg" style="font-size:11px; color:#ffff00; min-height:15px;"></div>
        `;

        document.body.appendChild(this.menu);

        const btn = document.getElementById('spawn-btn');
        const input = document.getElementById('asset-folder-name');
        const status = document.getElementById('status-msg');

        if(btn) {
            btn.onclick = () => {
                const folderName = input.value.trim();
                if (!folderName) {
                    status.innerText = "⚠️ Введи имя папки!";
                    return;
                }
                status.innerText = `Загрузка из assets/${folderName}...`;
                this.spawnAsset(folderName);
            };
        }

        // Блок координат
        this.coordsDiv = document.createElement('div');
        this.coordsDiv.style.position = 'absolute';
        this.coordsDiv.style.bottom = '20px';
        this.coordsDiv.style.right = '20px';
        this.coordsDiv.style.background = 'rgba(0,0,0,0.9)';
        this.coordsDiv.style.color = '#0f0';
        this.coordsDiv.style.padding = '15px';
        this.coordsDiv.style.border = '2px solid #0f0';
        this.coordsDiv.style.display = 'none';
        this.coordsDiv.style.fontFamily = 'monospace';
        this.coordsDiv.style.zIndex = '1000';
        this.coordsDiv.innerHTML = 'Объект не выбран';
        document.body.appendChild(this.coordsDiv);
    }

    toggle() {
        this.isActive = !this.isActive;
        this.menu.style.display = this.isActive ? 'block' : 'none';
        if (!this.isActive && this.selectedObject) this.coordsDiv.style.display = 'none';
        console.log("Редактор:", this.isActive ? "ВКЛ" : "ВЫКЛ");
        return this.isActive;
    }

    spawnAsset(folderName) {
        if (!this.camera) return;

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const spawnPos = this.camera.position.clone().add(direction.multiplyScalar(10));

        const url = `./assets/${folderName}/scene.gltf`;
        console.log(`--- ЗАГРУЗКА ИЗ ASSETS ---`);
        console.log(`Путь: ${url}`);

        this.loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                const statusDiv = document.getElementById('status-msg');
                statusDiv.innerText = "✅ Успешно!";
                setTimeout(() => statusDiv.innerText = "", 2000);

                // 1. СБРОС ТРАНСФОРМАЦИИ
                model.position.set(0, 0, 0);
                model.rotation.set(0, 0, 0);
                model.scale.set(1, 1, 1);
                model.updateMatrixWorld(true);

                // 2. АНАЛИЗ РАЗМЕРА
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);

                console.log(`Исходный размер: Y=${size.y.toFixed(2)}`);

                // 3. АВТО-ПОДБОР МАСШТАБА
                let scaleFix = 1.0;
                if (size.y > 10) {
                    scaleFix = 3.0 / size.y;
                } else if (size.y < 0.1) {
                    scaleFix = 2.0 / size.y;
                }

                model.scale.set(scaleFix, scaleFix, scaleFix);
                model.updateMatrixWorld(true);

                // 4. ЦЕНТРИРОВАНИЕ
                const newBox = new THREE.Box3().setFromObject(model);
                const center = newBox.getCenter(new THREE.Vector3());

                model.position.x -= center.x;
                model.position.z -= center.z;
                model.position.y -= newBox.min.y;
                model.updateMatrixWorld(true);

                // 5. ПРИМЕНЕНИЕ МАСШТАБА МИРА (x20)
                const worldScale = 20.0;
                model.scale.multiplyScalar(worldScale);
                model.updateMatrixWorld(true);

                // 6. УСТАНОВКА ПОЗИЦИИ
                model.position.copy(spawnPos);

                // 7. ПОДГОТОВКА МАТЕРИАЛОВ (СОХРАНЯЕМ ТЕКСТУРЫ!)
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Сохраняем оригинальный материал в userData, чтобы вернуть его позже
                        // Мы НЕ заменяем материал, а сохраняем ссылку на него
                        if (!child.userData.originalMaterial) {
                            child.userData.originalMaterial = child.material;
                            // Сохраняем оригинальное свечение, если оно было
                            child.userData.originalEmissive = child.material.emissive ? child.material.emissive.getHex() : 0x000000;
                            child.userData.originalColor = child.material.color ? child.material.color.getHex() : 0xffffff;
                        }
                    }
                });

                model.userData = { isEditable: true, type: folderName };

                this.scene.add(model);
                console.log(`ОБЪЕКТ ДОБАВЛЕН С ТЕКСТУРАМИ`);

                this.selectObject(model); // Сразу выделяем новый объект

            },
            undefined,
            (err) => {
                console.error("ОШИБКА ЗАГРУЗКИ:", err);
                const statusDiv = document.getElementById('status-msg');
                statusDiv.innerText = "❌ Ошибка! См. консоль";
                statusDiv.style.color = "red";
                alert(`Не удалось загрузить!\nПуть: ${url}\nПроверь наличие scene.gltf и текстур в папке.`);
            }
        );
    }

    selectObject(object) {
        // Сброс выделения с предыдущего объекта
        if (this.selectedObject) {
            this.selectedObject.traverse((child) => {
                if (child.isMesh && child.userData.originalMaterial) {
                    // ВОЗВРАЩАЕМ ОРИГИНАЛЬНЫЙ МАТЕРИАЛ ПОЛНОСТЬЮ
                    child.material = child.userData.originalMaterial;

                    // Сбрасываем свечение и цвет в исходное состояние
                    if (child.material.emissive) {
                        child.material.emissive.setHex(child.userData.originalEmissive || 0x000000);
                    }
                    if (child.material.color) {
                        child.material.color.setHex(child.userData.originalColor || 0xffffff);
                    }
                }
            });
        }

        this.selectedObject = object;

        if (this.selectedObject) {
            // ПОДСВЕТКА ВЫБРАННОГО (без замены материала!)
            this.selectedObject.traverse((child) => {
                if (child.isMesh) {
                    // Просто добавляем зеленое свечение поверх текстуры
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x00ff00); // Ярко-зеленое свечение
                        child.material.emissiveIntensity = 0.5;   // Интенсивность свечения
                    }
                    // Если материала нет или он странный, хотя бы цвет меняем
                    if (child.material.color && !child.material.map) {
                         child.material.color.setHex(0x00ff00);
                    }
                }
            });

            this.coordsDiv.style.display = 'block';
            this.updateCoordsDisplay();
        }
    }

    moveObject(keys) {
        if (!this.isActive || !this.selectedObject) return;
        const speed = keys.shiftKey ? this.moveSpeed : 0;
        if (speed === 0) return;

        if (keys.arrowUp) this.selectedObject.position.y += speed;
        if (keys.arrowDown) this.selectedObject.position.y -= speed;
        if (keys.arrowLeft) this.selectedObject.position.x -= speed;
        if (keys.arrowRight) this.selectedObject.position.x += speed;
        if (keys.w) this.selectedObject.position.z -= speed;
        if (keys.s) this.selectedObject.position.z += speed;

        this.updateCoordsDisplay();
    }

    updateCoordsDisplay() {
        if (!this.selectedObject) return;
        const p = this.selectedObject.position;
        this.coordsDiv.innerHTML = `
            <strong>${this.selectedObject.userData.type}</strong><br>
            X: ${p.x.toFixed(2)}<br>
            Y: ${p.y.toFixed(2)}<br>
            Z: ${p.z.toFixed(2)}
        `;
    }

    onMouseClick(event) {
        if (!this.isActive || !this.camera) return;
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
}