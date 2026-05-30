"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Config ───────────────────────────────────────────────────
const PARTICLE_COUNT = 50;
const CYCLE_DURATION = 7;
const CENTER = new THREE.Vector3(0, 0, 0);

const SOURCES = [
  { label: "FUNDAMENTALS", pos: new THREE.Vector3(-4.2,  2.4, 0), color: new THREE.Color("#00d4ff") },
  { label: "TECHNICALS",   pos: new THREE.Vector3( 4.2,  2.2, 0), color: new THREE.Color("#00ff88") },
  { label: "ORDERBOOK",    pos: new THREE.Vector3(-3.8, -2.2, 0), color: new THREE.Color("#4a6fff") },
  { label: "STRUCTURE",    pos: new THREE.Vector3( 3.8, -2.4, 0), color: new THREE.Color("#a855f7") },
  { label: "AI REASONING", pos: new THREE.Vector3( 0,    3.2, 0), color: new THREE.Color("#f5c842") },
];

// ── Holographic Grid (simplified) ───────────────────────────
function HoloGrid() {
  const ref = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const arr: THREE.Line[] = [];
    const mat = new THREE.LineBasicMaterial({ color: "#0a2a4a", transparent: true, opacity: 0.12 });
    const size = 10;
    const step = 1.2;
    for (let i = -size; i <= size; i += step) {
      arr.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, 0, -size), new THREE.Vector3(i, 0, size)
      ]), mat));
      arr.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-size, 0, i), new THREE.Vector3(size, 0, i)
      ]), mat));
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = -3.5 + Math.sin(clock.getElapsedTime() * 0.4) * 0.1;
    ref.current.rotation.x = -Math.PI * 0.42;
  });

  return (
    <group ref={ref}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  );
}

// ── Orbital Rings ────────────────────────────────────────────
function OrbitalRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI * 0.5;
      ring1Ref.current.rotation.z = t * 0.4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI * 0.35;
      ring2Ref.current.rotation.z = -t * 0.25;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.4, 0.01, 6, 64]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.22} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.9, 0.007, 6, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

// ── Source Orb ───────────────────────────────────────────────
function SourceOrb({ position, color }: { position: THREE.Vector3; color: THREE.Color }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.15);
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6;
      ringRef.current.scale.setScalar(1.4 + Math.sin(t * 1.5) * 0.15);
    }
  });

  return (
    <group position={position}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.4, 0.44, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Convergence Core ─────────────────────────────────────────
function ConvergenceCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      const pulse = 0.22 + Math.sin(t * 3) * 0.06;
      coreRef.current.scale.setScalar(pulse / 0.22);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.sin(t * 5) * 0.15;
    }
    if (wireRef.current) {
      wireRef.current.rotation.z = t * 0.4;
      wireRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.06} wireframe />
      </mesh>
    </group>
  );
}

// ── Data Streams (tubes from sources to center) ─────────────
function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);

  const streamData = useMemo(() => {
    return SOURCES.map((source) => {
      const mid = new THREE.Vector3().addVectors(source.pos, CENTER).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(CENTER, source.pos).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.6);
      const curve = new THREE.CatmullRomCurve3([source.pos.clone(), mid.clone().add(perp), CENTER.clone()]);
      return {
        geo: new THREE.TubeGeometry(curve, 32, 0.02, 6, false),
        glowGeo: new THREE.TubeGeometry(curve, 32, 0.07, 6, false),
        color: source.color,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const base = i % 2 === 0 ? 0.15 : 0.04;
        (child.material as THREE.MeshBasicMaterial).opacity = base + Math.sin(t * 2 + i * 1.3) * 0.06;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {streamData.map((stream, i) => (
        <group key={i}>
          <mesh geometry={stream.geo}>
            <meshBasicMaterial color={stream.color} transparent opacity={0.15} />
          </mesh>
          <mesh geometry={stream.glowGeo}>
            <meshBasicMaterial color={stream.color} transparent opacity={0.04} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Flow Particles ───────────────────────────────────────────
function FlowParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const total = PARTICLE_COUNT * SOURCES.length;

  const { positions, colors, offsets, sourceIndices } = useMemo(() => {
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const off = new Float32Array(total);
    const src = new Int32Array(total);

    for (let s = 0; s < SOURCES.length; s++) {
      const source = SOURCES[s];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = s * PARTICLE_COUNT + i;
        pos[idx * 3]     = source.pos.x + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 1] = source.pos.y + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 2] = (Math.random() - 0.5) * 0.4;
        col[idx * 3]     = source.color.r;
        col[idx * 3 + 1] = source.color.g;
        col[idx * 3 + 2] = source.color.b;
        off[idx] = i / PARTICLE_COUNT;
        src[idx] = s;
      }
    }
    return { positions: pos, colors: col, offsets: off, sourceIndices: src };
  }, []);

  const controlPoints = useMemo(() => {
    return SOURCES.map((source) => {
      const mid = new THREE.Vector3().addVectors(source.pos, CENTER).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(CENTER, source.pos).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.7);
      return { p0: source.pos.clone(), p1: mid.clone().add(perp), p2: CENTER.clone() };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.getAttribute("color") as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;

    for (let i = 0; i < total; i++) {
      const srcIdx = sourceIndices[i];
      const cp = controlPoints[srcIdx];
      const source = SOURCES[srcIdx];
      const progress = (cycle + offsets[i]) % 1;
      const inv = 1 - progress;
      const x = inv * inv * cp.p0.x + 2 * inv * progress * cp.p1.x + progress * progress * cp.p2.x;
      const y = inv * inv * cp.p0.y + 2 * inv * progress * cp.p1.y + progress * progress * cp.p2.y;
      const spiral = Math.sin(progress * Math.PI * 4 + t * 2 + i) * 0.06 * (1 - progress);
      const z = Math.sin(progress * Math.PI * 3 + i * 0.5) * 0.2 * (1 - progress * 0.7);

      posAttr.setXYZ(i, x + spiral * 0.4, y + spiral, z);

      const fade = progress < 0.1 ? progress / 0.1 : progress > 0.85 ? (1 - progress) / 0.15 : 0.5 + Math.sin(progress * Math.PI) * 0.3;
      colAttr.setXYZ(i, source.color.r * fade, source.color.g * fade, source.color.b * fade);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  const bufferGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <points ref={pointsRef} geometry={bufferGeo}>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

// ── Signal Beam ──────────────────────────────────────────────
function SignalBeam() {
  const beamRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 0, 0),
    new THREE.Vector3(2.5, 0.06, 0),
    new THREE.Vector3(4.5, -0.03, 0),
    new THREE.Vector3(6.5, 0, 0),
  ]), []);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.035, 6, false), [curve]);
  const glowTubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.12, 6, false), [curve]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const beamProgress = Math.max(0, (cycle - 0.45) / 0.35);
    const beamOpacity = beamProgress > 0 ? Math.min(1, beamProgress * 2.5) * (1 - Math.max(0, (beamProgress - 0.7) / 0.3)) : 0;
    const scaleX = 0.4 + beamProgress * 0.6;

    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.9;
      beamRef.current.scale.set(scaleX, 1, 1);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.1;
      glowRef.current.scale.set(scaleX, 1.5, 1);
    }
  });

  return (
    <group>
      <mesh ref={beamRef} geometry={tubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} />
      </mesh>
      <mesh ref={glowRef} geometry={glowTubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[6.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.3, 6]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// ── Ambient Stars ────────────────────────────────────────────
function AmbientStars() {
  const ref = useRef<THREE.Points>(null);

  const geo = useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.008;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.025} color="#2a5a8a" transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

// ── Pulse Rings ──────────────────────────────────────────────
function PulseRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const phase = ((t * 0.35 + i * 0.33) % 1);
        child.scale.setScalar(0.2 + phase * 2.2);
        (child.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.07;
      }
    });
  });

  return (
    <group ref={groupRef} rotation={[Math.PI * 0.5, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.95, 1, 48]} />
          <meshBasicMaterial color="#00e5a8" transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// ── Scene ────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <color attach="background" args={["#030810"]} />
      <AmbientStars />
      <HoloGrid />
      <DataStreams />
      <FlowParticles />
      {SOURCES.map((source, i) => (
        <SourceOrb key={i} position={source.pos} color={source.color} />
      ))}
      <ConvergenceCore />
      <OrbitalRings />
      <PulseRings />
      <SignalBeam />
    </>
  );
}

// ── Export ────────────────────────────────────────────────────
export default function SignalFlow3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.5, 8], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#030810" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
