<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    let {
        width=800, 
        height=400, 
        speedFactor=1, 
        starCount=120 
    }: { width: number, height: number, speedFactor: number, starCount: number } = $props()

    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D
    let raf = 0
    let stars: {
        x: number
        y: number
        size: number
        layer: number    // layer 0..2 (background -> foreground)
        twinkleOffset: number
        baseSpeed: number // individual star speed for variety
    }[] = []

    // initialize stars with smoother distribution
    function initStars() {
        stars = []
        for (let i = 0; i < starCount; i++) {
            const layer = Math.floor(Math.random() * 3) // 0,1,2
            const size = 0.5 + layer * 0.5 + Math.random() * 0.7
            
            // Give each star a slight speed variation for more organic feel
            const baseSpeed = 0.7 + Math.random() * 0.6
            
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size,
                layer,
                twinkleOffset: Math.random() * Math.PI * 2,
                baseSpeed
            })
        }
    }

    onMount(() => {
        ctx = canvas.getContext('2d')!
        canvas.width = width
        canvas.height = height
        initStars()
        lastTs = performance.now()
        raf = requestAnimationFrame(loop)
    })

    onDestroy(() => {
        cancelAnimationFrame(raf)
    })

    let lastTs = 0
    function loop(ts: number) {
        const dt = Math.min(100, Math.max(0, ts - lastTs)) // cap delta for stability
        lastTs = ts
        updateAndDraw(dt)
        raf = requestAnimationFrame(loop)
    }

    function updateAndDraw(dt: number) {
        // Clear and draw background gradient
        ctx.clearRect(0, 0, width, height)

        const g = ctx.createLinearGradient(0, 0, 0, height)
        g.addColorStop(0, 'rgba(10,12,20,1)')
        g.addColorStop(1, 'rgba(8,10,16,1)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)

        // Smoother speed calculation with better easing
        const baseSpeed = 0.012 * Math.max(0.3, speedFactor) // pixels per ms baseline
        
        // Move stars with layered parallax
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i]
            
            // Each layer moves at different speed for depth
            // Layer 0 (far): slowest, Layer 2 (near): fastest
            const layerSpeed = 0.25 + s.layer * 0.5
            
            // Combine base speed, layer speed, and individual variation
            const finalSpeed = baseSpeed * layerSpeed * s.baseSpeed
            
            s.x -= finalSpeed * dt

            // Smooth wrap-around
            if (s.x < -5) {
                s.x = width + 5
                s.y = Math.random() * height // randomize Y on wrap for variety
            }
        }

        // Draw stars with improved twinkle
        const time = performance.now()
        
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i]
            
            // Gentler, slower twinkle
            const twinkleSpeed = 0.002 + s.layer * 0.001
            const t = time * twinkleSpeed + s.twinkleOffset
            const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t))
            
            ctx.globalAlpha = Math.max(0.2, Math.min(0.95, alpha))

            // Subtle color variation per layer for depth
            if (s.layer === 0) {
                ctx.fillStyle = 'rgba(120,140,220,1)' // distant blue
            } else if (s.layer === 1) {
                ctx.fillStyle = 'rgba(180,190,240,1)' // mid-distance white-blue
            } else {
                ctx.fillStyle = 'rgba(240,235,220,1)' // close warm white
            }

            // Draw foreground stars as circles for better look
            if (s.layer === 2) {
                ctx.beginPath()
                ctx.arc(Math.round(s.x), Math.round(s.y), s.size, 0, Math.PI * 2)
                ctx.fill()
            } else {
                // Background stars as small rectangles (performance)
                const starSize = Math.max(0.8, s.size)
                ctx.fillRect(Math.round(s.x), Math.round(s.y), starSize, starSize)
            }
        }
        
        ctx.globalAlpha = 1
    }
</script>

<canvas bind:this={canvas} class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
