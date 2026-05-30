"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Config ───────────────────────────────────────────────────
const PARTICLE_COUNT = 100;
const SOURCE_COUNT = 5;
const CYCLE_DURATION = 7;
const CENTER = new THREE.Vector3(0, 0, 0);

const SOURCES = [
  { label: "MACRO",     pos: new THREE.Vector3(-4.2,  2.4, 0), color: new THREE.Color("#00d4ff") },
  { label: "PRICE",     pos: new THREE.Vector3( 4.2,  2.2, 0), color: new THREE.Color("#00ff88") },
  { label: "ORDERFLOW", pos: new THREE.Vector3(-3.8, -2.2, 0), color: new THREE.Color("#4a6fff") },
  { label: "ORDERBOOK", pos: new THREE.Vector3( 3.8, -2.4, 0), color: new THREE.Color("#a855f7") },
  { label: "AI",        pos: new THREE.Vector3( 0,    3.2, 0), color: new THREE.Color("#f5c842") },
];

// ── Holographic Grid Floor ───────────────────────────────────
function HoloGrid() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = -3.5 + Math.sin(t * 0.4) * 0.1;
    ref.current.rotation.x = -Math.PI * 0.42;
  });

  const gridLines = useMemo(() => {
    const lines: THREE.Line[] = [];
    const size = 12;
    const step = 0.6;
    const mat = new THREE.LineBasicMaterial({ color: "#0a2a4a", transparent: true, opacity: 0.15 });
    for (let i = -size; i <= size; i += step) {
      const g1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, 0, -size), new THREE.Vector3(i, 0, size)]);
      const g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-size, 0, i), new THREE.Vector3(size, 0, i)]);
      lines.push(new THREE.Line(g1, mat));
      lines.push(new THREE.Line(g2, mat));
    }
    return lines;
  }, []);

  return (
    <group ref={ref}>
      {gridLines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// ── Scan Line (horizontal sweep) ─────────────────────────────
function ScanLine() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const cycle = ((t * 0.3) % 1);
    const y = -4 + cycle * 10;
    ref.current.position.y = y;
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.12 * Math.sin(cycle * Math.PI);
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[20, 0.015]} />
      <meshBasicMaterial color="#00e5a8" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// ── Orbital Rings (around convergence) ───────────────────────
function OrbitalRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI * 0.5;
      ring1Ref.current.rotation.z = t * 0.4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI * 0.35;
      ring2Ref.current.rotation.y = t * 0.3;
      ring2Ref.current.rotation.z = -t * 0.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = Math.PI * 0.65;
      ring3Ref.current.rotation.z = t * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.4, 0.008, 8, 80]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.25} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.8, 0.006, 8, 80]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.18} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[2.2, 0.005, 8, 80]} />
        <meshBasicMaterial color="#4a6fff" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

// ── Hexagonal Wireframe ──────────────────────────────────────
function HexWireframe() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = t * 0.15;
    const s = 1 + Math.sin(t * 0.8) * 0.08;
    ref.current.scale.setScalar(s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.06 + Math.sin(t * 1.2) * 0.03;
  });

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[3, 3, 0.01, 6, 1, true]} />
      <meshBasicMaterial color="#00e5a8" transparent opacity={0.06} wireframe side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Source Orb (enhanced) ────────────────────────────────────
function SourceOrb({ position, color }: { position: THREE.Vector3; color: THREE.Color }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      const scale = 1 + Math.sin(t * 2.5) * 0.18;
      coreRef.current.scale.setScalar(scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6;
      ringRef.current.scale.setScalar(1.4 + Math.sin(t * 1.5) * 0.2);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.4;
      ring2Ref.current.rotation.x = Math.PI * 0.3;
      ring2Ref.current.scale.setScalar(1.8 + Math.sin(t * 1.1) * 0.15);
    }
  });

  return (
    <group position={position}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.4, 0.45, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[0.55, 0.58, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Convergence Core (enhanced) ──────────────────────────────
function ConvergenceCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const midRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      const pulse = 0.22 + Math.sin(t * 3) * 0.06;
      coreRef.current.scale.setScalar(pulse / 0.22);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.sin(t * 5) * 0.15;
    }
    if (midRef.current) {
      midRef.current.rotation.z = t * 0.5;
      const s = 1 + Math.sin(t * 2) * 0.12;
      midRef.current.scale.setScalar(s);
    }
    if (outerRef.current) {
      outerRef.current.rotation.z = -t * 0.25;
      const s = 1 + Math.sin(t * 1.5) * 0.2;
      outerRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={midRef}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.08} wireframe />
      </mesh>
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial color="#4a6fff" transparent opacity={0.04} wireframe />
      </mesh>
    </group>
  );
}

// ── Data Stream Tubes (source → center) ─────────────────────
function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);

  const streamData = useMemo(() => {
    return SOURCES.map((source) => {
      const mid = new THREE.Vector3()
        .addVectors(source.pos, CENTER)
        .multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(CENTER, source.pos).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.6);
      const curve = new THREE.CatmullRomCurve3([
        source.pos.clone(),
        mid.clone().add(perp),
        CENTER.clone(),
      ]);
      return {
        curve,
        geo: new THREE.TubeGeometry(curve, 40, 0.025, 6, false),
        glowGeo: new THREE.TubeGeometry(curve, 40, 0.08, 6, false),
        color: source.color,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const base = i % 2 === 0 ? 0.18 : 0.05;
        const pulse = Math.sin(t * 2 + i * 1.3) * 0.08;
        (child.material as THREE.MeshBasicMaterial).opacity = base + pulse;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {streamData.map((stream, i) => (
        <group key={i}>
          <mesh geometry={stream.geo}>
            <meshBasicMaterial color={stream.color} transparent opacity={0.18} />
          </mesh>
          <mesh geometry={stream.glowGeo}>
            <meshBasicMaterial
              color={stream.color}
              transparent
              opacity={0.04}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Flow Particles (enhanced with trails) ───────────────────
function FlowParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const total = PARTICLE_COUNT * SOURCE_COUNT;

  const { positions, colors, trailPositions, trailColors, offsets, sourceIndices } = useMemo(() => {
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const tPos = new Float32Array(total * 3);
    const tCol = new Float32Array(total * 3);
    const off = new Float32Array(total);
    const src = new Int32Array(total);

    for (let s = 0; s < SOURCE_COUNT; s++) {
      const source = SOURCES[s];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = s * PARTICLE_COUNT + i;
        pos[idx * 3]     = source.pos.x + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 1] = source.pos.y + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;
        col[idx * 3]     = source.color.r;
        col[idx * 3 + 1] = source.color.g;
        col[idx * 3 + 2] = source.color.b;
        tPos[idx * 3]     = pos[idx * 3];
        tPos[idx * 3 + 1] = pos[idx * 3 + 1];
        tPos[idx * 3 + 2] = pos[idx * 3 + 2];
        tCol[idx * 3]     = source.color.r;
        tCol[idx * 3 + 1] = source.color.g;
        tCol[idx * 3 + 2] = source.color.b;
        off[idx] = i / PARTICLE_COUNT;
        src[idx] = s;
      }
    }
    return { positions: pos, colors: col, trailPositions: tPos, trailColors: tCol, offsets: off, sourceIndices: src };
  }, []);

  const controlPoints = useMemo(() => {
    return SOURCES.map((source) => {
      const mid = new THREE.Vector3().addVectors(source.pos, CENTER).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(CENTER, source.pos).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.8);
      return {
        p0: source.pos.clone(),
        p1: mid.clone().add(perp),
        p2: CENTER.clone(),
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !trailRef.current) return;
    const geo = pointsRef.current.geometry;
    const trailGeo = trailRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const tPosAttr = trailGeo.getAttribute("position") as THREE.BufferAttribute;
    const tColAttr = trailGeo.getAttribute("color") as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;

    for (let i = 0; i < total; i++) {
      const srcIdx = sourceIndices[i];
      const cp = controlPoints[srcIdx];
      const source = SOURCES[srcIdx];
      const progress = (cycle + offsets[i]) % 1;

      // Bezier position
      const inv = 1 - progress;
      const x = inv * inv * cp.p0.x + 2 * inv * progress * cp.p1.x + progress * progress * cp.p2.x;
      const y = inv * inv * cp.p0.y + 2 * inv * progress * cp.p1.y + progress * progress * cp.p2.y;
      const spiral = Math.sin(progress * Math.PI * 4 + t * 2 + i) * 0.08 * (1 - progress);
      const z = Math.sin(progress * Math.PI * 3 + i * 0.5) * 0.25 * (1 - progress * 0.7);

      posAttr.setXYZ(i, x + spiral * 0.5, y + spiral, z);

      // Trail (slightly behind)
      const trailProgress = Math.max(0, progress - 0.06);
      const ti = 1 - trailProgress;
      const tx = ti * ti * cp.p0.x + 2 * ti * trailProgress * cp.p1.x + trailProgress * trailProgress * cp.p2.x;
      const ty = ti * ti * cp.p0.y + 2 * ti * trailProgress * cp.p1.y + trailProgress * trailProgress * cp.p2.y;
      tPosAttr.setXYZ(i, tx + spiral * 0.3, y - 0.02 + spiral * 0.5, z * 0.8);

      // Fade
      const fade = progress < 0.1 ? progress / 0.1 : progress > 0.85 ? (1 - progress) / 0.15 : 0.5 + Math.sin(progress * Math.PI) * 0.3;
      colAttr.setXYZ(i, source.color.r * fade, source.color.g * fade, source.color.b * fade);
      tColAttr.setXYZ(i, source.color.r * fade * 0.4, source.color.g * fade * 0.4, source.color.b * fade * 0.4);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    tPosAttr.needsUpdate = true;
    tColAttr.needsUpdate = true;
  });

  const bufferGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    return geo;
  }, [trailPositions, trailColors]);

  return (
    <>
      <points ref={trailRef} geometry={trailGeo}>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points ref={pointsRef} geometry={bufferGeo}>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}

// ── Signal Beam (enhanced with segments) ─────────────────────
function SignalBeam() {
  const beamRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const seg1Ref = useRef<THREE.Mesh>(null);
  const seg2Ref = useRef<THREE.Mesh>(null);
  const seg3Ref = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 0, 0),
    new THREE.Vector3(2, 0.08, 0),
    new THREE.Vector3(4, -0.03, 0),
    new THREE.Vector3(6.5, 0, 0),
  ]), []);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.035, 8, false), [curve]);
  const glowTubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.14, 8, false), [curve]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const beamProgress = Math.max(0, (cycle - 0.45) / 0.35);
    const beamOpacity = beamProgress > 0 ? Math.min(1, beamProgress * 2.5) * (1 - Math.max(0, (beamProgress - 0.7) / 0.3)) : 0;

    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.9;
      beamRef.current.scale.set(0.4 + beamProgress * 0.6, 1, 1);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.12;
      glowRef.current.scale.set(0.4 + beamProgress * 0.6, 1.6, 1);
    }

    // Segments pulse
    const segOpacity = beamOpacity * 0.6;
    [seg1Ref, seg2Ref, seg3Ref].forEach((ref, i) => {
      if (ref.current) {
        const offset = i * 0.08;
        const pulse = Math.sin(t * 6 + i * 2) * 0.3 + 0.7;
        (ref.current.material as THREE.MeshBasicMaterial).opacity = segOpacity * pulse;
        ref.current.scale.set(0.4 + beamProgress * 0.6, 1, 1);
      }
    });
  });

  return (
    <group>
      <mesh ref={beamRef} geometry={tubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} />
      </mesh>
      <mesh ref={glowRef} geometry={glowTubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Segments along beam */}
      {[1.5, 3, 4.5].map((x, i) => (
        <mesh key={i} ref={[seg1Ref, seg2Ref, seg3Ref][i]} position={[x, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {/* Arrow tip */}
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
  const count = 300;

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
      sizes[i] = Math.random() * 0.03 + 0.01;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * 0.008;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.025}
        color="#2a5a8a"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

// ── Data Pulses (rings that expand from center) ─────────────
function DataPulses() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const phase = ((t * 0.4 + i * 0.33) % 1);
        const scale = 0.2 + phase * 2.5;
        child.scale.setScalar(scale);
        (child.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.08;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[Math.PI * 0.5, 0, 0]}>
          <ringGeometry args={[0.95, 1, 64]} />
          <meshBasicMaterial color="#00e5a8" transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// ── Main Scene ───────────────────────────────────────────────
function Scene() {
  return (
    <>
      <color attach="background" args={["#030810"]} />
      <AmbientStars />
      <HoloGrid />
      <ScanLine />
      <HexWireframe />
      <DataStreams />
      <FlowParticles />
      {SOURCES.map((source, i) => (
        <SourceOrb key={i} position={source.pos} color={source.color} />
      ))}
      <ConvergenceCore />
      <OrbitalRings />
      <DataPulses />
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
