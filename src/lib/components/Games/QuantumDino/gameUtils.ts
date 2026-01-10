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

/**
 * Smooth difficulty ramp using sigmoid curve.
 * Returns ~1.0 → ~3.5 over several minutes (much slower than linear).
 */
export function computeDifficultyRamp(elapsedMs: number): number {
    const t = elapsedMs / 1000 // seconds
    const k = 0.0015           // slope (smaller = slower growth)
    const x0 = 180             // midpoint at ~3 min
    const sigmoid = 1 / (1 + Math.exp(-k * (t - x0)))
    return 1 + sigmoid * 2.5   // range: 1 → ~3.5
}

/** Update game speed (slower early game, smoother curve) */
export function computeGameSpeed(
    gameSpeed: number,
    deltaTime: number,
    elapsedMs: number,
    GAME_SPEED_INCREMENT: number,
    DIFFICULTY_ACCELERATION: number
): number {
    const ramp = computeDifficultyRamp(elapsedMs)

    let next = gameSpeed
    next += GAME_SPEED_INCREMENT * deltaTime * (0.4 + ramp * 0.35)
    next += DIFFICULTY_ACCELERATION * deltaTime * ramp * 0.25

    return next
}

/**
 * Convert speed → desired obstacle spacing in pixels.
 * Higher speed = larger spacing so player has reaction time.
 */
export function computeObstacleSpacing(gameSpeed: number) {
    const base = 260
    const speedFactor = clamp(gameSpeed, 4, 24)
    return base + speedFactor * 12
}

/**
 * Should spawn obstacle based on last obstacle X.
 * Call this every frame and pass last obstacle's x position.
 */
export function shouldSpawnObstacle(
    canvasWidth: number,
    lastObstacleX: number | null,
    gameSpeed: number
) {
    if (lastObstacleX === null) return true

    const spacing = computeObstacleSpacing(gameSpeed)
    return lastObstacleX < canvasWidth - spacing
}

/** Create one obstacle (biased for early game fairness) */
export function createObstacle(
    canvasWidth: number,
    groundY: number,
    gameSpeed: number,
    elapsedMs: number
): Obstacle {
    const ramp = computeDifficultyRamp(elapsedMs)

    // Birds appear later and gradually more often
    const birdChance = clamp(0.15 + ramp * 0.12, 0.15, 0.5)
    const isBird = Math.random() < birdChance

    const width = isBird ? 50 : 40
    const height = isBird ? 40 : 50

    const birdHeights = [groundY - 70, groundY - 110, groundY - 150]
    const yPos = isBird
        ? birdHeights[Math.floor(Math.random() * birdHeights.length)]
        : groundY

    const speed = Math.max(3, Math.floor(gameSpeed + ramp * 0.8))

    return {
        x: canvasWidth,
        y: yPos,
        width,
        height,
        type: isBird ? 'bird' : 'cactus',
        speed,
        active: true
    }
}

/**
 * Power-up spawn logic using cooldown instead of per-frame probability.
 * Prevents clustering and feels more intentional.
 */
export function shouldSpawnPowerUp(
    elapsedMs: number,
    lastPowerUpTimeMs: number,
    activePowerUps: number
) {
    if (activePowerUps > 0) return false

    const cooldown = 20000 // 20s base
    const jitter = Math.random() * 6000 // randomness
    return elapsedMs - lastPowerUpTimeMs > Math.random() * cooldown + jitter
}

/** Create power-up with safer vertical placement */
export function createPowerUp(canvasWidth: number, groundY: number): PowerUp {
    const type: PowerUpType = Math.random() < 0.65 ? 'quantum' : 'health'

    const heights = [
        groundY - 40,
        groundY - 90,
        groundY - 140
    ]

    return {
        x: canvasWidth,
        y: heights[Math.floor(Math.random() * heights.length)],
        width: 34,
        height: 34,
        type
    }
}

/** Physics update for dino (pure) */
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
