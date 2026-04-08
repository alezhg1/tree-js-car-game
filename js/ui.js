import { CAR_CONFIG } from './config.js';

// Получаем элементы сразу при загрузке модуля
const speedValueEl = document.getElementById('speed-value');
const gaugeFillEl = document.getElementById('gauge-fill');
const gearDisplayEl = document.getElementById('gear-display');
const coordsElement = document.getElementById('coords');

export function updateUI(carContainer, speed) {
    // Если элементов нет в HTML, просто выходим, чтобы не ломать игру
    if (!speedValueEl || !gaugeFillEl || !gearDisplayEl) return;

    const maxGameSpeed = CAR_CONFIG.maxSpeed;
    // Ограничиваем скорость для отображения (макс 70 км/ч на шкале)
    const kmh = Math.abs((speed / maxGameSpeed) * 70);

    // Обновляем цифры скорости
    speedValueEl.innerText = Math.floor(kmh);

    // Логика передач
    if (speed === 0) {
        gearDisplayEl.innerText = 'N';
        gearDisplayEl.style.color = '#aaa';
    } else if (speed > 0) {
        if (kmh < 20) gearDisplayEl.innerText = '1';
        else if (kmh < 40) gearDisplayEl.innerText = '2';
        else if (kmh < 55) gearDisplayEl.innerText = '3';
        else gearDisplayEl.innerText = '4';
        gearDisplayEl.style.color = '#ff3333';
    } else {
        gearDisplayEl.innerText = 'R';
        gearDisplayEl.style.color = '#ffaa00';
    }

    // Анимация стрелки
    const normalizedSpeed = Math.min(kmh / 70, 1);
    const rotation = 135 + (normalizedSpeed * 270);
    gaugeFillEl.style.transform = `rotate(${rotation}deg)`;

    // Цвет зоны отсечки
    if (normalizedSpeed > 0.85) {
        gaugeFillEl.style.borderTopColor = '#ff0000';
        gaugeFillEl.style.borderRightColor = '#ff0000';
        gaugeFillEl.style.filter = 'drop-shadow(0 0 10px #ff0000)';
        speedValueEl.style.color = '#ff0000';
    } else {
        gaugeFillEl.style.borderTopColor = '#ff3333';
        gaugeFillEl.style.borderRightColor = '#ff3333';
        gaugeFillEl.style.filter = 'drop-shadow(0 0 5px #ff3333)';
        speedValueEl.style.color = '#fff';
    }

    // Координаты (обновляем только если элемент есть)
    if (coordsElement) {
        // Если включен редактор или разведка, там свой текст, не перезаписываем его случайно
        // Но в обычном режиме пишем координаты машины
        const x = carContainer.position.x.toFixed(2);
        const y = carContainer.position.y.toFixed(2);
        const z = carContainer.position.z.toFixed(2);
        
        // Проверяем, не пишет ли туда редактор свои данные (по наличию слова "РАЗВЕДКА" или "Объект")
        if (!coordsElement.innerText.includes('РАЗВЕДКА') && !coordsElement.innerText.includes('Объект')) {
             coordsElement.innerText = `X: ${x} | Y: ${y} | Z: ${z}`;
        }
    }
}