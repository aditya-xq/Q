// Pure helpers for Quantum Dino. No DOM or Svelte-specific side effects here.

export interface GameObject {
    x: number
    y: number
    width: number
    height: number
}

export interface Dino extends GameObject {
    velocityY: number
    isJumping: boolean
    isQuantum: boolean
    quantumTimer: number
}

export type ObstacleType = 'cactus' | 'bird'

export interface Obstacle extends GameObject {
    type: ObstacleType
    speed: number
    active: boolean
}

export type PowerUpType = 'quantum' | 'health'

export interface PowerUp extends GameObject {
    type: PowerUpType
}

// Small utility
export function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v))
}

/** Simple AABB collision check with padding */
export function checkCollision(
    obj1: GameObject,
    obj2: GameObject,
    padX = 8,
    padY = 8
): boolean {
    return (
        obj1.x + padX < obj2.x + obj2.width - padX &&
        obj1.x + obj1.width - padX > obj2.x + padX &&
        obj1.y + padY < obj2.y + obj2.height - padY &&
        obj1.y + obj1.height - padY > obj2.y + padY
    )
}

/** Difficulty ramp: returns multiplier (1..5) — used for tuned difficulty growth */
export function computeDifficultyRamp(elapsedMs: number): number {
    // +1 per minute up to +4 -> returns 1..5 multiplier
    return 1 + Math.min(4, elapsedMs / 60000)
}

/** Update game speed using your constants (pure) */
export function computeGameSpeed(
    gameSpeed: number,
    deltaTime: number,
    elapsedMs: number,
    GAME_SPEED_INCREMENT: number,
    DIFFICULTY_ACCELERATION: number
): number {
    const difficultyRamp = computeDifficultyRamp(elapsedMs)
    let next = gameSpeed
    next += GAME_SPEED_INCREMENT * deltaTime * (0.8 + difficultyRamp * 0.5)
    next += DIFFICULTY_ACCELERATION * deltaTime * (elapsedMs / 1000)
    return next
}

/** Convert current speed into a spawn rate (ms). Keeps consistent with original logic. */
export function computeSpawnRate(gameSpeed: number) {
    const currentSpeedCap = Math.min(gameSpeed, 28)
    return Math.max(450, 1600 - currentSpeedCap * 80)
}

/** Create one obstacle (pure). Caller pushes it into the obstacles array. */
export function createObstacle(
    canvasWidth: number,
    groundY: number,
    gameSpeed: number
): Obstacle {
    const isBird = Math.random() > 0.55
    const width = isBird ? 50 : 40
    const height = isBird ? 40 : 50
    const yPos = isBird ? groundY - 70 - Math.random() * 40 : groundY
    const speedOffset = isBird ? 1 : 0
    return {
        x: canvasWidth,
        y: yPos,
        width,
        height,
        type: isBird ? 'bird' : 'cactus',
        speed: Math.max(3, Math.floor(gameSpeed) + speedOffset),
        active: true
    }
}

/** Should we spawn a power-up this update? (pure) */
export function shouldSpawnPowerUp(currentPowerUpsLength: number, prob = 0.003) {
    return currentPowerUpsLength === 0 && Math.random() < prob
}

/** Create a power-up (pure). Caller pushes into powerUps. */
export function createPowerUp(canvasWidth: number, groundY: number) {
    const type: PowerUpType = Math.random() > 0.6 ? 'health' : 'quantum'
    return {
        x: canvasWidth,
        y: groundY - 50 - Math.random() * 80,
        width: 35,
        height: 35,
        type
    } as PowerUp
}

/** Physics update for dino (pure) — returns a new Dino object */
export function updateDinoPhysics(
  d: Dino,
  GRAVITY: number,
  GROUND_Y: number
): Dino {
    const next = { ...d }
    next.velocityY += GRAVITY
    next.y += next.velocityY
    if (next.y >= GROUND_Y) {
        next.y = GROUND_Y
        next.velocityY = 0
        next.isJumping = false
    }
    return next
}
