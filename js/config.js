export const TELEPORT_TO_TENT = true;
export const TARGET_POS = { x: 25.63, y: 0.22, z: 37.62 };

export const CAR_CONFIG = {
    maxSpeed: 0.2,          // Максимальная скорость (осталась высокой)
    reverseSpeed: 0.03,     // Скорость заднего хода
    acceleration: 0.01,    // ИЗМЕНЕНО: Было 0.03. Теперь разгон плавный и постепенный.
    friction: 0.98,         // Чуть увеличил трение для более естественного выбега
    brakeForce: 0.005,      // Сила торможения
    turnSpeed: 0.045,        // ИЗМЕНЕНО: Было 0.04. Теперь повороты менее резкие.
    collisionDistance: 0.6
};

export const CAMERA_CONFIG = {
    distance: 0.7,          // Расстояние от машины
    height: 0.8,            // ИЗМЕНЕНО: Было 0.35. Теперь камера выше (лучший обзор).

    // ИЗМЕНЕНО: Было 0.6 (очень резко).
    // 0.15 - это "золотая середина": камера следует плавно, но успевает за быстрыми поворотами.
    lerpPosition: 0.15,
    lerpLookAt: 0.15
};

// НАСТРОЙКИ ВРЕМЕНИ СУТОК И НЕБА
export const TIME_CONFIG = {
    dayDuration: 10,       // 3 минуты дня
    nightDuration: 180,     // 3 минуты ночи
    headlightIntensity: 8,
    headlightDistance: 100,
    sunHeightDay: 100,
    sunHeightNight: -50,
    starCount: 5000         // Количество звезд
};