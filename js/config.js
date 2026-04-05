export const TELEPORT_TO_TENT = true;
export const TARGET_POS = { x: 25.63, y: 0.22, z: 37.62 };

export const CAR_CONFIG = {
    maxSpeed: 0.05,
    reverseSpeed: 0.03,
    acceleration: 0.0008,
    friction: 0.995,
    brakeForce: 0.002,
    turnSpeed: 0.017,
    collisionDistance: 0.6
};

export const CAMERA_CONFIG = {
    distance: 0.7,
    height: 0.35,
    lerpPosition: 0.1,
    lerpLookAt: 0.02
};

// НАСТРОЙКИ ВРЕМЕНИ СУТОК И НЕБА
export const TIME_CONFIG = {
    dayDuration: 40,       // 3 минуты дня
    nightDuration: 40,     // 3 минуты ночи
    headlightIntensity: 8,
    headlightDistance: 100,
    sunHeightDay: 100,
    sunHeightNight: -50,
    starCount: 5000         // Количество звезд
};