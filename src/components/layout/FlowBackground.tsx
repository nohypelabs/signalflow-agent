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
}

const COLORS = [
  "#00E5A8", // accent green
  "#00D4FF", // info cyan
  "#8B5CF6", // purple
  "#00FF88", // buy green
  "#FF8800", // hold orange
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
    const maxParticles = 120;
    const connectionDistance = 150;

    function createParticle(): Particle {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 500,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2 + 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0,
        life: 0,
        maxLife: Math.random() * 300 + 200,
      };
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife; // start at random life stage
      particles.push(p);
    }

    function project(p: Particle): { x: number; y: number; scale: number } {
      const fov = 500;
      const scale = fov / (fov + p.z);
      return {
        x: p.x * scale,
        y: p.y * scale,
        scale,
      };
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life++;

        // Calculate alpha based on life
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.1) {
          p.alpha = lifeRatio / 0.1;
        } else if (lifeRatio > 0.9) {
          p.alpha = (1 - lifeRatio) / 0.1;
        } else {
          p.alpha = 1;
        }
        p.alpha *= 0.4; // overall opacity

        // Wrap around
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.z < -200) p.z = 500;
        if (p.z > 500) p.z = -200;

        // Reset if life ended
        if (p.life >= p.maxLife) {
          Object.assign(p, createParticle());
        }

        // Project to 2D
        const proj = project(p);
        const size = p.size * proj.scale;

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(proj.x, proj.y, size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.alpha * proj.scale;
        ctx!.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const proj2 = project(p2);

          const dx = proj.x - proj2.x;
          const dy = proj.y - proj2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const lineAlpha = (1 - dist / connectionDistance) * 0.15 * Math.min(p.alpha, p2.alpha);
            ctx!.beginPath();
            ctx!.moveTo(proj.x, proj.y);
            ctx!.lineTo(proj2.x, proj2.y);
            ctx!.strokeStyle = p.color;
            ctx!.globalAlpha = lineAlpha;
            ctx!.lineWidth = 0.5 * Math.min(proj.scale, proj2.scale);
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
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  );
}
