"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

const COLORS = [
  "#00E5A8", // accent green
  "#00D4FF", // info cyan
  "#8B5CF6", // purple
  "#00FF88", // buy green
  "#4ADE80", // light green
];

export default function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = [];
    const maxParticles = 200;
    const connectionDistance = 180;
    const trailLength = 8;

    // Flow field parameters
    let time = 0;
    const flowScale = 0.002;
    const flowSpeed = 0.3;

    function createParticle(): Particle {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 600 - 100,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2.5 + 0.5,
        color,
        alpha: 0,
        life: 0,
        maxLife: Math.random() * 400 + 200,
        trail: [],
      };
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    function project(p: Particle): { x: number; y: number; scale: number } {
      const fov = 600;
      const scale = fov / (fov + p.z);
      return {
        x: p.x * scale,
        y: p.y * scale,
        scale,
      };
    }

    // Simple noise function for flow field
    function noise(x: number, y: number, t: number): number {
      return Math.sin(x * flowScale + t) * Math.cos(y * flowScale + t * 0.7) * 0.5 + 0.5;
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);
      time += flowSpeed * 0.01;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Flow field influence
        const angle = noise(p.x, p.y, time) * Math.PI * 2;
        p.vx += Math.cos(angle) * 0.02;
        p.vy += Math.sin(angle) * 0.02;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.vz *= 0.995;

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life++;

        // Trail
        const proj = project(p);
        p.trail.unshift({ x: proj.x, y: proj.y, alpha: 0.3 });
        if (p.trail.length > trailLength) p.trail.pop();

        // Calculate alpha based on life
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.1) {
          p.alpha = lifeRatio / 0.1;
        } else if (lifeRatio > 0.85) {
          p.alpha = (1 - lifeRatio) / 0.15;
        } else {
          p.alpha = 1;
        }
        p.alpha *= 0.5;

        // Wrap around
        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;
        if (p.y < -50) p.y = height + 50;
        if (p.y > height + 50) p.y = -50;
        if (p.z < -200) p.z = 600;
        if (p.z > 600) p.z = -200;

        // Reset if life ended
        if (p.life >= p.maxLife) {
          Object.assign(p, createParticle());
        }

        const size = p.size * proj.scale;
        const finalAlpha = p.alpha * proj.scale;

        // Draw trail
        if (p.trail.length > 1) {
          ctx!.beginPath();
          ctx!.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx!.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx!.strokeStyle = p.color;
          ctx!.globalAlpha = finalAlpha * 0.2;
          ctx!.lineWidth = size * 0.5;
          ctx!.stroke();
        }

        // Draw particle with glow
        ctx!.beginPath();
        ctx!.arc(proj.x, proj.y, size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = finalAlpha;
        ctx!.fill();

        // Glow effect
        ctx!.beginPath();
        ctx!.arc(proj.x, proj.y, size * 3, 0, Math.PI * 2);
        const gradient = ctx!.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 3);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "transparent");
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = finalAlpha * 0.15;
        ctx!.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const proj2 = project(p2);

          const dx = proj.x - proj2.x;
          const dy = proj.y - proj2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const lineAlpha = (1 - dist / connectionDistance) * 0.2 * Math.min(p.alpha, p2.alpha);
            const midX = (proj.x + proj2.x) / 2;
            const midY = (proj.y + proj2.y) / 2;

            // Curved connection line
            ctx!.beginPath();
            ctx!.moveTo(proj.x, proj.y);
            ctx!.quadraticCurveTo(midX + (Math.random() - 0.5) * 20, midY + (Math.random() - 0.5) * 20, proj2.x, proj2.y);
            ctx!.strokeStyle = p.color;
            ctx!.globalAlpha = lineAlpha * proj.scale;
            ctx!.lineWidth = 0.6 * Math.min(proj.scale, proj2.scale);
            ctx!.stroke();
          }
        }
      }

      ctx!.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
}
