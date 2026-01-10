<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { GameHUD, GameOverlay, LegendItem, Starfield, TitlePane } from './components'
	import {
		checkCollision,
		computeGameSpeed,
		createObstacle,
		shouldSpawnObstacle,
		shouldSpawnPowerUp,
		createPowerUp,
		updateDinoPhysics,
		type Dino,
		type Obstacle,
		type PowerUp
    } from './gameUtils'

    // --- Game Constants ---
    const CANVAS_WIDTH = 800
    const CANVAS_HEIGHT = 400
    const GROUND_Y = 320

    const GAME_SPEED_START = 1
    const GRAVITY = 0.8
    const JUMP_FORCE = -15
    const GAME_SPEED_INCREMENT = 0.0003
    const DIFFICULTY_ACCELERATION = 0.0000005

    const OBSTACLE_DAMAGE = 20
    const HEALTH_RESTORE = 30
    const QUANTUM_DURATION = 4000

    const DINO_WIDTH = 40
    const DINO_HEIGHT = 50

	// --- State (Runes) ---
	let gameState = $state<'start' | 'playing' | 'paused' | 'gameOver'>('start')
	let score = $state(0)
	let highScore = $state(0)
	let gameSpeed = $state(GAME_SPEED_START)
	let health = $state(100)
	let damageFlashOpacity = $state(0)

	// elapsed time (ms) for difficulty scaling
	let elapsed = 0

	// Game Objects
	let dino = $state<Dino>({
		x: 50,
		y: GROUND_Y,
		width: DINO_WIDTH,
		height: DINO_HEIGHT,
		velocityY: 0,
		isJumping: false,
		isQuantum: false,
		quantumTimer: 0
	})

	let obstacles = $state<Obstacle[]>([])
	let powerUps = $state<PowerUp[]>([])

	// Technical vars
	let canvas: HTMLCanvasElement
	let ctx: CanvasRenderingContext2D
	let animationId = 0
	let lastTime = 0

	// Track last obstacle (rightmost) x and last power-up spawn time
	let lastObstacleX: number | null = null
	let lastPowerUpTimeMs = 0

	// --- Lifecycle ---
	onMount(() => {
		try {
			const saved = localStorage.getItem('quantumDinoHighScore')
			if (saved) {
				const parsed = parseInt(saved, 10)
				if (!isNaN(parsed)) highScore = parsed
			}
		} catch (e) {
			console.error('Failed to load high score', e)
		}

		ctx = canvas.getContext('2d')!
		ctx.imageSmoothingEnabled = false

		window.addEventListener('keydown', handleKeyDown)

		// initial render
		requestAnimationFrame(() => draw(0))
	})

	onDestroy(() => {
		cancelAnimationFrame(animationId)
		window.removeEventListener('keydown', handleKeyDown)
	})

	// --- Core Logic ---
	function startGame() {
		if (gameState === 'playing') return

		gameState = 'playing'
		score = 0
		gameSpeed = GAME_SPEED_START
		health = 100
		damageFlashOpacity = 0
		elapsed = 0

		obstacles = []
		powerUps = []

		lastObstacleX = null
		lastPowerUpTimeMs = 0

		resetDino()

		lastTime = performance.now()
		gameLoop(lastTime)
	}

	function togglePause() {
		if (gameState === 'playing') {
			gameState = 'paused'
			cancelAnimationFrame(animationId)
		} else if (gameState === 'paused') {
			gameState = 'playing'
			lastTime = performance.now()
			gameLoop(lastTime)
		}
	}

	function resetDino() {
		dino = {
			x: 50,
			y: GROUND_Y,
			width: DINO_WIDTH,
			height: DINO_HEIGHT,
			velocityY: 0,
			isJumping: false,
			isQuantum: false,
			quantumTimer: 0
		}
	}

	// --- Input Handling (jump-only) ---
	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Escape' || e.code === 'KeyP') {
			togglePause()
			return
		}

        if (gameState === 'gameOver') return

		if (gameState !== 'playing') {
			if (e.code === 'Space' || e.code === 'Enter') startGame()
			return
		}

		if (e.code === 'Space' || e.code === 'ArrowUp') {
			e.preventDefault()
			jump()
		}
	}

	function jump() {
		if (!dino.isJumping && gameState === 'playing') {
			dino.velocityY = JUMP_FORCE
			dino.isJumping = true
		}
	}

	// --- Game Loop ---
	function gameLoop(currentTime: number) {
		if (gameState !== 'playing') return

		const deltaTime = currentTime - lastTime
		lastTime = currentTime

		update(deltaTime)
		draw(currentTime)

		if (health <= 0) {
			triggerGameOver()
			return
		}

		animationId = requestAnimationFrame(gameLoop)
	}

	function update(deltaTime: number) {
		elapsed += deltaTime

		// score growth scaled to frame time and current speed
		score += 0.05 * (deltaTime / 16) * Math.max(1, gameSpeed / 6)

		// compute new speed via pure helper
		gameSpeed = computeGameSpeed(
			gameSpeed,
			deltaTime,
			elapsed,
			GAME_SPEED_INCREMENT,
			DIFFICULTY_ACCELERATION
		)

		if (damageFlashOpacity > 0) damageFlashOpacity = Math.max(0, damageFlashOpacity - deltaTime * 0.0018)

		// dino physics
		dino = updateDinoPhysics(dino, GRAVITY, GROUND_Y)

		if (dino.isQuantum) {
			dino.quantumTimer -= deltaTime
			if (dino.quantumTimer <= 0) dino.isQuantum = false
		}

		// --- Obstacle spawning using spacing-based rule ---
		// Update rightmost obstacle x for spacing logic
		const rightmostX = obstacles.length > 0 ? Math.max(...obstacles.map(o => o.x)) : null
		lastObstacleX = rightmostX ?? lastObstacleX

		if (shouldSpawnObstacle(CANVAS_WIDTH, lastObstacleX, gameSpeed)) {
			const o = createObstacle(CANVAS_WIDTH, GROUND_Y, gameSpeed, elapsed)
			obstacles.push(o)
			// set lastObstacleX to newly spawned obstacle's x (canvas right edge)
			lastObstacleX = o.x
		}

		// Move obstacles and handle collisions
		obstacles = obstacles.filter(obs => {
			obs.x -= obs.speed * (deltaTime / 16)
			if (obs.active && checkCollision(dino, obs)) {
				if (!dino.isQuantum) {
					takeDamage()
					obs.active = false
				}
			}
			// keep obstacles slightly past left edge for clean removal
			return obs.x + obs.width > -50
		})

		// after moving, update lastObstacleX to current rightmost (so spacing uses live positions)
		lastObstacleX = obstacles.length > 0 ? Math.max(...obstacles.map(o => o.x)) : null

		// --- Power-up spawning (cooldown-based) ---
		if (shouldSpawnPowerUp(elapsed, lastPowerUpTimeMs, powerUps.length)) {
			powerUps.push(createPowerUp(CANVAS_WIDTH, GROUND_Y))
			lastPowerUpTimeMs = elapsed
		}

		// Move power-ups and check collect
		powerUps = powerUps.filter(p => {
			p.x -= gameSpeed * (deltaTime / 16)
			if (checkCollision(dino, p)) {
				if (p.type === 'quantum') {
					dino.isQuantum = true
					dino.quantumTimer = QUANTUM_DURATION
				} else {
					health = Math.min(100, health + HEALTH_RESTORE)
				}
				return false
			}
			return p.x > -50
		})
	}

	// --- Draw Logic ---
	function draw(currentTime: number) {
		if (!ctx) return

		// Reset canvas state
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		ctx.globalAlpha = 1
		ctx.filter = 'none'
		ctx.shadowBlur = 0
		ctx.shadowColor = 'transparent'
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		// ground
		ctx.beginPath()
		ctx.strokeStyle = '#475569'
		ctx.lineWidth = 2
		ctx.moveTo(0, GROUND_Y + 45)
		ctx.lineTo(CANVAS_WIDTH, GROUND_Y + 45)
		ctx.stroke()

		// Dino (flipped to face right)
		ctx.save()
		if (dino.isQuantum) {
			ctx.globalAlpha = 0.85
			ctx.shadowColor = '#06b6d4'
			ctx.shadowBlur = 18
		}
		if (damageFlashOpacity > 0.5) {
			ctx.filter = 'sepia(1) saturate(5000%) hue-rotate(-50deg)'
		}

		ctx.font = '50px serif'
		ctx.textBaseline = 'top'
		const cx = dino.x + dino.width / 2
		const cy = dino.y
		ctx.translate(cx, cy)
		ctx.scale(-1, 1)
		ctx.fillText('🦖', -dino.width / 2 - 6, -6)
		ctx.restore()

		// Obstacles
		obstacles.forEach(obs => {
			ctx.save()
			ctx.globalAlpha = obs.active ? 1 : 0.45
			ctx.textBaseline = 'top'
			ctx.font = obs.type === 'cactus' ? '50px serif' : '45px serif'
			const emoji = obs.type === 'cactus' ? '🌵' : '🦅'
			ctx.fillText(emoji, obs.x - 6, obs.y - 6)
			ctx.restore()
		})

		// PowerUps (gentle bob)
		powerUps.forEach(p => {
			const bob = Math.sin(currentTime * 0.005 + p.x * 0.01) * 5
			ctx.save()
			ctx.font = '35px serif'
			ctx.textBaseline = 'top'
			ctx.fillText(p.type === 'quantum' ? '⚛️' : '❤️', p.x, p.y + bob)
			ctx.restore()
		})

		// Damage overlay
		if (damageFlashOpacity > 0) {
			ctx.save()
			ctx.fillStyle = `rgba(220, 38, 38, ${damageFlashOpacity})`
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
			ctx.restore()
		}
	}

	function takeDamage() {
		health = Math.max(0, health - OBSTACLE_DAMAGE)
		damageFlashOpacity = Math.max(damageFlashOpacity, 0.6)
	}

	function triggerGameOver() {
		if (score > highScore) {
			highScore = Math.floor(score)
			try {
				localStorage.setItem('quantumDinoHighScore', highScore.toString())
			} catch {}
		}

		damageFlashOpacity = 0
		draw(lastTime)

		gameState = 'gameOver'
		cancelAnimationFrame(animationId)
	}
</script>

<div class="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 touch-none select-none">
    <div class="w-full max-w-5xl space-y-6">
		<TitlePane gameState={gameState} score={score} highScore={highScore} togglePause={togglePause} />
        <div class="relative w-full aspect-2/1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden ring-1 ring-white/10">
            <!-- Starfield behind the game canvas -->
            <div class="absolute inset-0 -z-10">
                <Starfield speedFactor={Math.max(0.2, gameSpeed / 8)} />
            </div>
            <canvas
                bind:this={canvas}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                class="w-full h-full object-contain cursor-pointer relative z-0"
                onclick={() => {
                    if (gameState === 'start' || gameState === 'gameOver') startGame()
                    else if (gameState === 'paused') togglePause()
                    else jump()
                }}
            ></canvas>
            <GameHUD {gameState} {health} {dino} {gameSpeed} QUANTUM_DURATION={QUANTUM_DURATION} />
            <GameOverlay {gameState} {score} startGame={startGame} togglePause={togglePause} />
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <LegendItem emoji="❤️" title="Health" desc="Restores HP" colorClass="text-red-400" />
            <LegendItem emoji="⚛️" title="Quantum" desc="Invincibility" colorClass="text-cyan-400" />
            <LegendItem emoji="🦅" title="Birds" desc="Jump timing challenge" colorClass="text-amber-400" />
            <LegendItem emoji="🌵" title="Cactus" desc="Jump to avoid" colorClass="text-green-400" />
        </div>
    </div>
</div>
