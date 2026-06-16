"use client";

import { useEffect, useRef } from "react";

interface Node {
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
  connections: number[];
  type: "source" | "hub" | "output";
}

interface FlowParticle {
  x: number;
  y: number;
  z: number;
  progress: number;
  speed: number;
  fromNode: number;
  toNode: number;
  color: string;
  size: number;
}

const NODE_COLORS = {
  source: "#00E5A8",  // green — data sources
  hub: "#00D4FF",     // cyan — processing hubs
  output: "#8B5CF6",  // purple — signal outputs
};

const NODE_COUNT = 30;
const FLOW_PARTICLE_COUNT = 60;

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

    const nodes: Node[] = [];
    const flowParticles: FlowParticle[] = [];
    let time = 0;

    // Create nodes in a network topology
    function initNodes() {
      nodes.length = 0;

      // Source nodes (left side) — represent data feeds
      for (let i = 0; i < 8; i++) {
        nodes.push({
          x: width * 0.1 + Math.random() * width * 0.15,
          y: height * 0.1 + (height * 0.8 * i) / 7,
          z: Math.random() * 200 - 50,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          vz: (Math.random() - 0.5) * 0.3,
          size: 2 + Math.random() * 2,
          color: NODE_COLORS.source,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          connections: [],
          type: "source",
        });
      }

      // Hub nodes (center) — represent processing
      for (let i = 0; i < 12; i++) {
        nodes.push({
          x: width * 0.35 + Math.random() * width * 0.3,
          y: height * 0.05 + (height * 0.9 * i) / 11,
          z: Math.random() * 300 - 100,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.15,
          vz: (Math.random() - 0.5) * 0.2,
          size: 2.5 + Math.random() * 2.5,
          color: NODE_COLORS.hub,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          connections: [],
          type: "hub",
        });
      }

      // Output nodes (right side) — represent signals
      for (let i = 0; i < 10; i++) {
        nodes.push({
          x: width * 0.75 + Math.random() * width * 0.15,
          y: height * 0.1 + (height * 0.8 * i) / 9,
          z: Math.random() * 200 - 50,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.2,
          vz: (Math.random() - 0.5) * 0.25,
          size: 2 + Math.random() * 2,
          color: NODE_COLORS.output,
          alpha: 0,
          pulse: Math.random() * Math.PI * 2,
          connections: [],
          type: "output",
        });
      }

      // Create connections: source → hub → output
      for (let i = 0; i < 8; i++) {
        // Each source connects to 2-3 hubs
        const hubs = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const targetHubs = hubs.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
        nodes[i].connections = targetHubs;
      }

      for (let i = 8; i < 20; i++) {
        // Each hub connects to 2-4 outputs
        const outputs = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
        const targetOutputs = outputs.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
        nodes[i].connections = targetOutputs;
      }
    }

    function initFlowParticles() {
      flowParticles.length = 0;
      for (let i = 0; i < FLOW_PARTICLE_COUNT; i++) {
        const fromNode = Math.floor(Math.random() * NODE_COUNT);
        const conn = nodes[fromNode].connections;
        if (conn.length === 0) continue;
        const toNode = conn[Math.floor(Math.random() * conn.length)];

        flowParticles.push({
          x: nodes[fromNode].x,
          y: nodes[fromNode].y,
          z: nodes[fromNode].z,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.005,
          fromNode,
          toNode,
          color: nodes[fromNode].color,
          size: 1 + Math.random() * 1.5,
        });
      }
    }

    initNodes();
    initFlowParticles();

    function project(x: number, y: number, z: number): { px: number; py: number; scale: number } {
      const fov = 700;
      const scale = fov / (fov + z);
      return { px: x * scale, py: y * scale, scale };
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);
      time += 0.016;

      // Update nodes
      for (const node of nodes) {
        // Gentle drift
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;
        node.pulse += 0.03;

        // Bounce softly
        if (node.x < width * 0.05 || node.x > width * 0.95) node.vx *= -1;
        if (node.y < height * 0.05 || node.y > height * 0.95) node.vy *= -1;
        if (node.z < -200 || node.z > 400) node.vz *= -1;

        // Fade in
        node.alpha = Math.min(1, node.alpha + 0.02);
      }

      // Draw connections
      for (const node of nodes) {
        const from = project(node.x, node.y, node.z);
        for (const connIdx of node.connections) {
          const target = nodes[connIdx];
          const to = project(target.x, target.y, target.z);

          const dist = Math.sqrt((from.px - to.px) ** 2 + (from.py - to.py) ** 2);
          const maxDist = 400;
          if (dist > maxDist) continue;

          const alpha = (1 - dist / maxDist) * 0.15 * Math.min(node.alpha, target.alpha);

          // Draw connection line
          ctx!.beginPath();
          ctx!.moveTo(from.px, from.py);

          // Bezier curve for organic feel
          const midX = (from.px + to.px) / 2;
          const midY = (from.py + to.py) / 2;
          const offset = Math.sin(time + connIdx) * 15;
          ctx!.quadraticCurveTo(midX + offset, midY - offset, to.px, to.py);

          ctx!.strokeStyle = node.color;
          ctx!.globalAlpha = alpha * from.scale;
          ctx!.lineWidth = 0.8 * from.scale;
          ctx!.stroke();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const proj = project(node.x, node.y, node.z);
        const size = node.size * proj.scale;
        const pulse = Math.sin(node.pulse) * 0.3 + 0.7;
        const finalAlpha = node.alpha * proj.scale * pulse;

        // Glow
        const glowSize = size * 5;
        const gradient = ctx!.createRadialGradient(proj.px, proj.py, 0, proj.px, proj.py, glowSize);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, glowSize, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = finalAlpha * 0.12;
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size, 0, Math.PI * 2);
        ctx!.fillStyle = node.color;
        ctx!.globalAlpha = finalAlpha;
        ctx!.fill();

        // Inner bright spot
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 0.4, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = finalAlpha * 0.6;
        ctx!.fill();
      }

      // Update and draw flow particles
      for (const fp of flowParticles) {
        fp.progress += fp.speed;
        if (fp.progress >= 1) {
          // Reset to new path
          fp.progress = 0;
          fp.fromNode = fp.toNode;
          const conn = nodes[fp.fromNode].connections;
          if (conn.length > 0) {
            fp.toNode = conn[Math.floor(Math.random() * conn.length)];
            fp.color = nodes[fp.fromNode].color;
          }
        }

        const from = nodes[fp.fromNode];
        const to = nodes[fp.toNode];
        const t = fp.progress;

        // Interpolate position along curve
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const midZ = (from.z + to.z) / 2;
        const offset = Math.sin(time * 2 + fp.fromNode) * 20;

        fp.x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * (midX + offset) + t * t * to.x;
        fp.y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * (midY - offset) + t * t * to.y;
        fp.z = (1 - t) * (1 - t) * from.z + 2 * (1 - t) * t * midZ + t * t * to.z;

        const proj = project(fp.x, fp.y, fp.z);
        const size = fp.size * proj.scale;

        // Fade at start/end
        const fadeAlpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;

        // Draw flow particle with glow
        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size * 2, 0, Math.PI * 2);
        const grad = ctx!.createRadialGradient(proj.px, proj.py, 0, proj.px, proj.py, size * 2);
        grad.addColorStop(0, fp.color);
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.globalAlpha = fadeAlpha * proj.scale * 0.5;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(proj.px, proj.py, size, 0, Math.PI * 2);
        ctx!.fillStyle = fp.color;
        ctx!.globalAlpha = fadeAlpha * proj.scale * 0.8;
        ctx!.fill();
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
      initNodes();
      initFlowParticles();
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
