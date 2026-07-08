import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
  blinkSpeed: number
  blinkOffset: number
  color: string
}

interface Nebula {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
}

interface ShootingStar {
  x: number
  y: number
  dx: number
  dy: number
  life: number
  maxLife: number
  length: number
}

const STAR_COLORS = [
  'rgba(255, 255, 255, ',
  'rgba(255, 255, 255, ',
  'rgba(255, 255, 255, ',
  'rgba(200, 220, 255, ',
  'rgba(180, 200, 255, ',
  'rgba(0, 240, 255, ',
  'rgba(180, 77, 255, ',
  'rgba(255, 215, 0, ',
]

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    speed: Math.random() * 0.3 + 0.05,
    blinkSpeed: Math.random() * 0.02 + 0.005,
    blinkOffset: Math.random() * Math.PI * 2,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  }))
}

const NEBULAE: Nebula[] = [
  { x: 20, y: 30, radius: 180, color: 'rgba(0, 240, 255, ', opacity: 0.04 },
  { x: 75, y: 20, radius: 140, color: 'rgba(180, 77, 255, ', opacity: 0.03 },
  { x: 50, y: 70, radius: 200, color: 'rgba(99, 102, 241, ', opacity: 0.03 },
  { x: 85, y: 80, radius: 120, color: 'rgba(0, 240, 255, ', opacity: 0.02 },
]

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>(generateStars(150))
  const shootersRef = useRef<ShootingStar[]>([])
  const lastShooter = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    function spawnShooter(timestamp: number) {
      if (timestamp - lastShooter.current > 8000 + Math.random() * 12000) {
        lastShooter.current = timestamp
        shootersRef.current.push({
          x: Math.random() * 100,
          y: Math.random() * 40,
          dx: (Math.random() - 0.5) * 0.4,
          dy: 0.3 + Math.random() * 0.2,
          life: 0,
          maxLife: 1.5 + Math.random(),
          length: 40 + Math.random() * 60,
        })
      }
    }

    function draw(timestamp: number) {
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)

      // Nebulae
      for (const n of NEBULAE) {
        const grad = ctx.createRadialGradient(
          (n.x / 100) * w, (n.y / 100) * h, 0,
          (n.x / 100) * w, (n.y / 100) * h, n.radius * Math.min(w, h) / 100
        )
        grad.addColorStop(0, n.color + String(n.opacity) + ')')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      // Stars
      for (const star of starsRef.current) {
        const alpha = star.opacity * (0.6 + 0.4 * Math.sin(timestamp * star.blinkSpeed + star.blinkOffset))
        const sx = (star.x / 100) * w
        const sy = ((star.y / 100) * h + timestamp * star.speed * 0.01) % h

        ctx.beginPath()
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
        ctx.fillStyle = star.color + String(alpha) + ')'
        ctx.fill()
      }

      // Shooting stars
      spawnShooter(timestamp)
      for (let i = shootersRef.current.length - 1; i >= 0; i--) {
        const s = shootersRef.current[i]
        s.life += 0.016
        s.x += s.dx
        s.y += s.dy

        const sx = (s.x / 100) * w
        const sy = (s.y / 100) * h
        const angle = Math.atan2(s.dy, s.dx)
        const tailX = sx - Math.cos(angle) * s.length
        const tailY = sy - Math.sin(angle) * s.length

        const alpha = Math.max(0, 1 - s.life / s.maxLife)
        const grad = ctx.createLinearGradient(tailX, tailY, sx, sy)
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.6})`)

        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(sx, sy)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()

        if (s.life > s.maxLife) {
          shootersRef.current.splice(i, 1)
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
