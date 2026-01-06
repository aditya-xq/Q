<script lang="ts">
    import { onMount, onDestroy } from 'svelte'

    export let width: number = 800
    export let height: number = 400
    export let speedFactor: number = 1      // passed from game to sync parallax a little
    export let starCount: number = 120      // reasonable default

    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D
    let raf = 0
    let stars: {
        x: number
        y: number
        size: number
        layer: number    // layer 0..2 (background -> foreground)
        twinkleOffset: number
    }[] = []

    // initialize stars
    function initStars() {
        stars = []
        for (let i = 0; i < starCount; i++) {
        const layer = Math.floor(Math.random() * 3) // 0,1,2
        const size = 0.5 + layer * 0.6 + Math.random() * 0.8
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size,
            layer,
            twinkleOffset: Math.random() * Math.PI * 2
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
        const dt = Math.max(0, ts - lastTs)
        lastTs = ts
        updateAndDraw(dt)
        raf = requestAnimationFrame(loop)
    }

    function updateAndDraw(dt: number) {
        // Very lightweight: clear + draw stars
        ctx.clearRect(0, 0, width, height)

        // layered parallax subtle gradients
        // background faint gradient to match aesthetic
        const g = ctx.createLinearGradient(0, 0, 0, height)
        g.addColorStop(0, 'rgba(10,12,20,1)')
        g.addColorStop(1, 'rgba(8,10,16,1)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)

        // move stars left a tad based on dt and speedFactor; different layers move differently
        const baseSpeed = 0.01 * speedFactor // pixels per ms baseline
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i]
            const layerMul = 0.3 + s.layer * 0.9 // farther layers slower
            s.x -= baseSpeed * dt * layerMul * (1 + s.layer * 0.25)

            // wrap-around
            if (s.x < -4) s.x = width + 4
        }

        // Draw stars with twinkle
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i]
            const t = performance.now() * 0.004 + s.twinkleOffset
            const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t + s.layer))
            ctx.globalAlpha = Math.max(0.15, Math.min(1, alpha))

            // slight color variation per layer for depth
            if (s.layer === 0) ctx.fillStyle = 'rgba(140,160,255,1)'
            else if (s.layer === 1) ctx.fillStyle = 'rgba(200,200,255,1)'
            else ctx.fillStyle = 'rgba(255,240,220,1)'

            // draw as a filled rect (cheap) or small circle for foreground
            if (s.layer === 2) {
                ctx.beginPath()
                ctx.arc(Math.round(s.x), Math.round(s.y), Math.max(0.6, s.size), 0, Math.PI * 2)
                ctx.fill()
            } else {
                ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.max(1, s.size), Math.max(1, s.size))
            }
        }
        ctx.globalAlpha = 1
    }
</script>

<canvas bind:this={canvas} class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
