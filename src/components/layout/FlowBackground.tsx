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
  targets: number[];
}

interface Beam {
  from: number;
  to: number;
  progress: number;
  speed: number;
  width: number;
  color: string;
  active: boolean;
  cooldown: number;
}

const SATELLITE_COUNT = 20;
const BEAM_COUNT = 40;

const COLORS = {
  source: "#00E5A8",
  processor: "#00D4FF",
  output: "#8B5CF6",
  beam: "#00E5A8",
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
    const beams: Beam[] = [];
    let time = 0;

    function init() {
      satellites.length = 0;
      beams.length = 0;

      // Source satellites (left region)
      for (let i = 0; i < 6; i++) {
        satellites.push({
          x: width * 0.08 + Math.random() * width * 0.12,
          y: height * 0.15 + (height * 0.7 * i) / 5,
          z: Math.random() * 300 - 50,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.1,
          vz: (Math.random() - 0.5) * 0.2,
          size: 3 + Math.random() * 2,
          color: COLORS.source,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "source",
          targets: [],
        });
      }

      // Processor satellites (center)
      for (let i = 0; i < 8; i++) {
        satellites.push({
          x: width * 0.35 + Math.random() * width * 0.3,
          y: height * 0.1 + (height * 0.8 * i) / 7,
          z: Math.random() * 400 - 100,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.08,
          vz: (Math.random() - 0.5) * 0.15,
          size: 4 + Math.random() * 2,
          color: COLORS.processor,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "processor",
          targets: [],
        });
      }

      // Output satellites (right region)
      for (let i = 0; i < 6; i++) {
        satellites.push({
          x: width * 0.75 + Math.random() * width * 0.15,
          y: height * 0.15 + (height * 0.7 * i) / 5,
          z: Math.random() * 300 - 50,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.1,
          vz: (Math.random() - 0.5) * 0.18,
          size: 3 + Math.random() * 2,
          color: COLORS.output,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          type: "output",
          targets: [],
        });
      }

      // Create beam connections: source → processor → output
      // Sources shoot to processors
      for (let i = 0; i < 6; i++) {
        const targetCount = 1 + Math.floor(Math.random() * 2);
        const available = [6, 7, 8, 9, 10, 11, 12, 13];
        const targets = available.sort(() => Math.random() - 0.5).slice(0, targetCount);
        satellites[i].targets = targets;
      }

      // Processors shoot to outputs
      for (let i = 6; i < 14; i++) {
        const targetCount = 1 + Math.floor(Math.random() * 2);
        const available = [14, 15, 16, 17, 18, 19];
        const targets = available.sort(() => Math.random() - 0.5).slice(0, targetCount);
        satellites[i].targets = targets;
      }

      // Create beams
      for (let i = 0; i < satellites.length; i++) {
        for (const targetIdx of satellites[i].targets) {
          beams.push({
            from: i,
            to: targetIdx,
            progress: 0,
            speed: 0.008 + Math.random() * 0.012,
            width: 1.5 + Math.random() * 1.5,
            color: satellites[i].color,
            active: true,
            cooldown: Math.random() * 200,
          });
        }
      }
    }

    init();

    function project(x: number, y: number, z: number): { px: number; py: number; scale: number } {
      const fov = 800;
      const scale = fov / (fov + z);
      return { px: x * scale, py: y * scale, scale };
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);
      time += 0.016;

      // Update satellites
      for (const sat of satellites) {
        sat.x += sat.vx;
        sat.y += sat.vy;
        sat.z += sat.vz;
        sat.pulse += 0.04;
        sat.alpha = Math.min(1, sat.alpha + 0.015);

        // Soft bounce
        if (sat.x < width * 0.03 || sat.x > width * 0.97) sat.vx *= -1;
        if (sat.y < height * 0.05 || sat.y > height * 0.95) sat.vy *= -1;
        if (sat.z < -200 || sat.z > 500) sat.vz *= -1;
      }

      // Draw beams FIRST (behind satellites)
      for (const beam of beams) {
        if (!beam.active) continue;

        beam.cooldown -= 1;
        if (beam.cooldown > 0) continue;

        beam.progress += beam.speed;

        if (beam.progress >= 1) {
          beam.progress = 0;
          beam.cooldown = 50 + Math.random() * 150; // delay before next beam
          continue;
        }

        const from = satellites[beam.from];
        const to = satellites[beam.to];
        const pFrom = project(from.x, from.y, from.z);
        const pTo = project(to.x, to.y, to.z);

        const t = beam.progress;
        const beamX = pFrom.px + (pTo.px - pFrom.px) * t;
        const beamY = pFrom.py + (pTo.py - pFrom.py) * t;

        // Beam trail (line from source to current position)
        const trailAlpha = 0.3 * Math.min(from.alpha, to.alpha);
        ctx!.beginPath();
        ctx!.moveTo(pFrom.px, pFrom.py);
        ctx!.lineTo(beamX, beamY);
        ctx!.strokeStyle = beam.color;
        ctx!.globalAlpha = trailAlpha * 0.3;
        ctx!.lineWidth = beam.width * pFrom.scale;
        ctx!.stroke();

        // Beam head (glowing dot)
        const headSize = (beam.width * 2 + 2) * pFrom.scale;
        const headAlpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;

        // Outer glow
        const glowSize = headSize * 4;
        const gradient = ctx!.createRadialGradient(beamX, beamY, 0, beamX, beamY, glowSize);
        gradient.addColorStop(0, beam.color);
        gradient.addColorStop(0.3, beam.color);
        gradient.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(beamX, beamY, glowSize, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = headAlpha * 0.4 * pFrom.scale;
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(beamX, beamY, headSize, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = headAlpha * 0.9 * pFrom.scale;
        ctx!.fill();

        // Beam tail (fading trail)
        const tailLength = 0.15;
        const tailStart = Math.max(0, t - tailLength);
        for (let i = 0; i < 5; i++) {
          const tt = tailStart + (t - tailStart) * (i / 5);
          const tx = pFrom.px + (pTo.px - pFrom.px) * tt;
          const ty = pFrom.py + (pTo.py - pFrom.py) * tt;
          const tailAlpha2 = (i / 5) * headAlpha * 0.3;
          const tailSize = headSize * (0.3 + (i / 5) * 0.7);

          ctx!.beginPath();
          ctx!.arc(tx, ty, tailSize, 0, Math.PI * 2);
          ctx!.fillStyle = beam.color;
          ctx!.globalAlpha = tailAlpha2 * pFrom.scale;
          ctx!.fill();
        }
      }

      // Draw connection lines (faint, always visible)
      for (const beam of beams) {
        const from = satellites[beam.from];
        const to = satellites[beam.to];
        const pFrom = project(from.x, from.y, from.z);
        const pTo = project(to.x, to.y, to.z);

        ctx!.beginPath();
        ctx!.moveTo(pFrom.px, pFrom.py);
        ctx!.lineTo(pTo.px, pTo.py);
        ctx!.strokeStyle = beam.color;
        ctx!.globalAlpha = 0.04 * Math.min(from.alpha, to.alpha);
        ctx!.lineWidth = 0.5 * pFrom.scale;
        ctx!.stroke();
      }

      // Draw satellites
      for (const sat of satellites) {
        const proj = project(sat.x, sat.y, sat.z);
        const size = sat.size * proj.scale;
        const pulse = Math.sin(sat.pulse) * 0.3 + 0.7;
        const finalAlpha = sat.alpha * proj.scale * pulse;

        // Outer ring (antenna feel)
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 2.5, 0, Math.PI * 2);
        ctx!.strokeStyle = sat.color;
        ctx!.globalAlpha = finalAlpha * 0.15;
        ctx!.lineWidth = 0.5 * proj.scale;
        ctx!.stroke();

        // Middle ring
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 1.5, 0, Math.PI * 2);
        ctx!.strokeStyle = sat.color;
        ctx!.globalAlpha = finalAlpha * 0.25;
        ctx!.lineWidth = 0.8 * proj.scale;
        ctx!.stroke();

        // Core body
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size, 0, Math.PI * 2);
        ctx!.fillStyle = sat.color;
        ctx!.globalAlpha = finalAlpha * 0.8;
        ctx!.fill();

        // Bright center
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 0.35, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = finalAlpha * 0.7;
        ctx!.fill();

        // Signal wave pulse (expanding ring)
        const wavePhase = (sat.pulse * 0.5) % (Math.PI * 2);
        const waveRadius = size * 3 + wavePhase * size * 0.8;
        const waveAlpha = Math.max(0, 1 - wavePhase / (Math.PI * 2)) * 0.1;

        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, waveRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = sat.color;
        ctx!.globalAlpha = waveAlpha * finalAlpha;
        ctx!.lineWidth = 1 * proj.scale;
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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.75 }}
      aria-hidden="true"
    />
  );
}
