"use client";

import { useEffect, useRef } from "react";

interface Satellite {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  pulse: number;
  type: "source" | "processor" | "output";
}

interface Connection {
  from: number;
  to: number;
  energy: number;
  energySpeed: number;
  color: string;
}

const SATELLITE_COUNT = 18;

const COLORS = {
  source: "#00E5A8",
  processor: "#00D4FF",
  output: "#8B5CF6",
};

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

    const satellites: Satellite[] = [];
    const connections: Connection[] = [];

    function init() {
      satellites.length = 0;
      connections.length = 0;

      // Source satellites (left)
      for (let i = 0; i < 5; i++) {
        satellites.push({
          x: width * 0.1 + Math.random() * width * 0.08,
          y: height * 0.2 + (height * 0.6 * i) / 4,
          z: Math.random() * 200 - 50,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.06,
          vz: (Math.random() - 0.5) * 0.1,
          size: 3.5 + Math.random() * 1.5,
          color: COLORS.source,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "source",
        });
      }

      // Processor satellites (center)
      for (let i = 0; i < 8; i++) {
        satellites.push({
          x: width * 0.35 + Math.random() * width * 0.3,
          y: height * 0.1 + (height * 0.8 * i) / 7,
          z: Math.random() * 300 - 80,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.05,
          vz: (Math.random() - 0.5) * 0.08,
          size: 4 + Math.random() * 2,
          color: COLORS.processor,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "processor",
        });
      }

      // Output satellites (right)
      for (let i = 0; i < 5; i++) {
        satellites.push({
          x: width * 0.78 + Math.random() * width * 0.1,
          y: height * 0.2 + (height * 0.6 * i) / 4,
          z: Math.random() * 200 - 50,
          vx: (Math.random() - 0.5) * 0.07,
          vy: (Math.random() - 0.5) * 0.06,
          vz: (Math.random() - 0.5) * 0.09,
          size: 3.5 + Math.random() * 1.5,
          color: COLORS.output,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "output",
        });
      }

      // Create connections: source → processor → output (pipeline)
      // Each source connects to 2 processors
      for (let i = 0; i < 5; i++) {
        const targets = [5, 6, 7, 8, 9, 10, 11, 12];
        const t1 = targets[i % targets.length];
        const t2 = targets[(i + 1) % targets.length];
        connections.push({ from: i, to: t1, energy: Math.random(), energySpeed: 0.003 + Math.random() * 0.004, color: COLORS.source });
        connections.push({ from: i, to: t2, energy: Math.random(), energySpeed: 0.003 + Math.random() * 0.004, color: COLORS.source });
      }

      // Each processor connects to 2 outputs
      for (let i = 5; i < 13; i++) {
        const targets = [13, 14, 15, 16, 17];
        const t1 = targets[(i - 5) % targets.length];
        const t2 = targets[(i - 4) % targets.length];
        connections.push({ from: i, to: t1, energy: Math.random(), energySpeed: 0.003 + Math.random() * 0.004, color: COLORS.processor });
        connections.push({ from: i, to: t2, energy: Math.random(), energySpeed: 0.003 + Math.random() * 0.004, color: COLORS.processor });
      }

      // Cross-connections between processors (mesh feel)
      for (let i = 5; i < 12; i++) {
        connections.push({ from: i, to: i + 1, energy: Math.random(), energySpeed: 0.002 + Math.random() * 0.003, color: COLORS.processor });
      }
    }

    init();

    function project(x: number, y: number, z: number) {
      const fov = 800;
      const scale = fov / (fov + z);
      return { px: x * scale, py: y * scale, scale };
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);

      // Update satellites
      for (const sat of satellites) {
        sat.x += sat.vx;
        sat.y += sat.vy;
        sat.z += sat.vz;
        sat.pulse += 0.03;
        sat.alpha = Math.min(1, sat.alpha + 0.01);

        // Keep within viewport bounds
        if (sat.x < 0 || sat.x > width) sat.vx *= -1;
        if (sat.y < 0 || sat.y > height) sat.vy *= -1;
        if (sat.z < -200 || sat.z > 400) sat.vz *= -1;
        sat.x = Math.max(0, Math.min(width, sat.x));
        sat.y = Math.max(0, Math.min(height, sat.y));
      }

      // Draw connections FIRST
      for (const conn of connections) {
        const from = satellites[conn.from];
        const to = satellites[conn.to];
        const pFrom = project(from.x, from.y, from.z);
        const pTo = project(to.x, to.y, to.z);

        const dist = Math.sqrt((pFrom.px - pTo.px) ** 2 + (pFrom.py - pTo.py) ** 2);
        const maxDist = 500;
        if (dist > maxDist) continue;

        const baseAlpha = (1 - dist / maxDist) * 0.12 * Math.min(from.alpha, to.alpha);

        // Persistent connection line
        ctx!.beginPath();
        ctx!.moveTo(pFrom.px, pFrom.py);
        ctx!.lineTo(pTo.px, pTo.py);
        ctx!.strokeStyle = conn.color;
        ctx!.globalAlpha = baseAlpha;
        ctx!.lineWidth = 1 * pFrom.scale;
        ctx!.stroke();

        // Flowing energy along the line
        conn.energy += conn.energySpeed;
        if (conn.energy >= 1) conn.energy -= 1;

        const e = conn.energy;
        const ex = pFrom.px + (pTo.px - pFrom.px) * e;
        const ey = pFrom.py + (pTo.py - pFrom.py) * e;

        // Energy dot with glow
        const dotSize = 2.5 * pFrom.scale;
        const glowSize = dotSize * 4;

        const gradient = ctx!.createRadialGradient(ex, ey, 0, ex, ey, glowSize);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.2, conn.color);
        gradient.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(ex, ey, glowSize, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = baseAlpha * 1.5;
        ctx!.fill();

        // Energy core
        ctx!.beginPath();
        ctx!.arc(ex, ey, dotSize, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = baseAlpha * 2;
        ctx!.fill();
      }

      // Draw satellites
      for (const sat of satellites) {
        const proj = project(sat.x, sat.y, sat.z);
        const size = sat.size * proj.scale;
        const pulse = Math.sin(sat.pulse) * 0.2 + 0.8;
        const finalAlpha = sat.alpha * proj.scale * pulse;

        // Outer glow
        const glowSize = size * 6;
        const gradient = ctx!.createRadialGradient(proj.px, proj.py, 0, proj.px, proj.py, glowSize);
        gradient.addColorStop(0, sat.color);
        gradient.addColorStop(0.5, sat.color);
        gradient.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, glowSize, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = finalAlpha * 0.08;
        ctx!.fill();

        // Ring
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 1.8, 0, Math.PI * 2);
        ctx!.strokeStyle = sat.color;
        ctx!.globalAlpha = finalAlpha * 0.2;
        ctx!.lineWidth = 0.6 * proj.scale;
        ctx!.stroke();

        // Body
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size, 0, Math.PI * 2);
        ctx!.fillStyle = sat.color;
        ctx!.globalAlpha = finalAlpha * 0.7;
        ctx!.fill();

        // Bright core
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 0.3, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = finalAlpha * 0.8;
        ctx!.fill();

        // Signal wave (broadcast ring)
        const wavePhase = (sat.pulse * 0.3) % (Math.PI * 2);
        const waveRadius = size * 2 + wavePhase * size * 0.5;
        const waveAlpha = Math.max(0, 1 - wavePhase / (Math.PI * 2)) * 0.08;

        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, waveRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = sat.color;
        ctx!.globalAlpha = waveAlpha * finalAlpha;
        ctx!.lineWidth = 0.8 * proj.scale;
        ctx!.stroke();
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
      init();
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
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ opacity: 0.75, maxWidth: "100vw" }}
      aria-hidden="true"
    />
  );
}
