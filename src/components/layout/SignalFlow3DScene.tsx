"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Config ---
const PARTICLE_COUNT = 120;
const SOURCE_COUNT = 5;
const CYCLE_DURATION = 6; // seconds per full flow cycle
const CONVERGENCE_POINT = new THREE.Vector3(0, 0, 0);

const SOURCES = [
  { label: "MACRO",       pos: new THREE.Vector3(-4.2,  2.4, 0), color: new THREE.Color("#00d4ff") },
  { label: "PRICE",       pos: new THREE.Vector3( 4.2,  2.2, 0), color: new THREE.Color("#00ff88") },
  { label: "ORDERFLOW",   pos: new THREE.Vector3(-3.8, -2.2, 0), color: new THREE.Color("#4a6fff") },
  { label: "ORDERBOOK",   pos: new THREE.Vector3( 3.8, -2.4, 0), color: new THREE.Color("#a855f7") },
  { label: "AI",          pos: new THREE.Vector3( 0,    3.2, 0), color: new THREE.Color("#f5c842") },
];

// --- Source Orb ---
function SourceOrb({ position, color }: { position: THREE.Vector3; color: THREE.Color }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      const s = 1.4 + Math.sin(t * 1.5) * 0.2;
      ringRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      {/* Core glow */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {/* Outer halo */}
      <mesh>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      {/* Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.42, 0.48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// --- Convergence Core ---
function ConvergenceCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      const pulse = 0.25 + Math.sin(t * 3) * 0.08;
      coreRef.current.scale.setScalar(pulse / 0.25);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 4) * 0.2;
    }
    if (outerRef.current) {
      outerRef.current.rotation.z = -t * 0.3;
      const s = 1 + Math.sin(t * 2) * 0.15;
      outerRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      {/* Mid glow */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.2} />
      </mesh>
      {/* Outer glow */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// --- Signal Beam ---
function SignalBeam() {
  const beamRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 0, 0),
      new THREE.Vector3(2, 0.1, 0),
      new THREE.Vector3(4, -0.05, 0),
      new THREE.Vector3(6, 0, 0),
    ]);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;

    // Beam appears after convergence (50%+ of cycle)
    const beamProgress = Math.max(0, (cycle - 0.45) / 0.3);
    const beamOpacity = beamProgress > 0 ? Math.min(1, beamProgress * 2) * (1 - Math.max(0, (beamProgress - 0.7) / 0.3)) : 0;

    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.9;
      const scaleX = 0.5 + beamProgress * 0.5;
      beamRef.current.scale.set(scaleX, 1, 1);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity * 0.15;
      const scaleX = 0.5 + beamProgress * 0.5;
      glowRef.current.scale.set(scaleX, 1.8, 1);
    }
  });

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.04, 8, false), [curve]);
  const glowTubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.15, 8, false), [curve]);

  return (
    <group>
      <mesh ref={beamRef} geometry={tubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} />
      </mesh>
      <mesh ref={glowRef} geometry={glowTubeGeo}>
        <meshBasicMaterial color="#00e5a8" transparent opacity={0} />
      </mesh>
      {/* Arrow tip */}
      <mesh position={[6.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.35, 12]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// --- Flow Particles ---
function FlowParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const totalParticles = PARTICLE_COUNT * SOURCE_COUNT;

  const { positions, colors, offsets, sourceIndices } = useMemo(() => {
    const pos = new Float32Array(totalParticles * 3);
    const col = new Float32Array(totalParticles * 3);
    const off = new Float32Array(totalParticles);
    const src = new Int32Array(totalParticles);

    for (let s = 0; s < SOURCE_COUNT; s++) {
      const source = SOURCES[s];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = s * PARTICLE_COUNT + i;
        // Start at source position with small random offset
        pos[idx * 3]     = source.pos.x + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 1] = source.pos.y + (Math.random() - 0.5) * 0.3;
        pos[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;

        col[idx * 3]     = source.color.r;
        col[idx * 3 + 1] = source.color.g;
        col[idx * 3 + 2] = source.color.b;

        // Stagger particle start times
        off[idx] = i / PARTICLE_COUNT;
        src[idx] = s;
      }
    }

    return {
      positions: pos,
      colors: col,
      offsets: off,
      sourceIndices: src,
    };
  }, []);

  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const controlPoints = useMemo(() => {
    // Pre-compute bezier control points for each source → center
    return SOURCES.map((source) => {
      const mid = new THREE.Vector3()
        .addVectors(source.pos, CONVERGENCE_POINT)
        .multiplyScalar(0.5);
      // Add some curve perpendicular to the line
      const dir = new THREE.Vector3().subVectors(CONVERGENCE_POINT, source.pos).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.8);
      return {
        p0: source.pos.clone(),
        p1: mid.clone().add(perp),
        p2: CONVERGENCE_POINT.clone(),
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;

    for (let i = 0; i < totalParticles; i++) {
      const srcIdx = sourceIndices[i];
      const cp = controlPoints[srcIdx];
      const source = SOURCES[srcIdx];

      // Each particle has its own phase within the cycle
      let progress = (cycle + offsets[i]) % 1;

      // Bezier curve position
      const invProgress = 1 - progress;
      const x = invProgress * invProgress * cp.p0.x + 2 * invProgress * progress * cp.p1.x + progress * progress * cp.p2.x;
      const y = invProgress * invProgress * cp.p0.y + 2 * invProgress * progress * cp.p1.y + progress * progress * cp.p2.y;

      // Add slight spiral motion
      const spiral = Math.sin(progress * Math.PI * 4 + t * 2 + i) * 0.08 * (1 - progress);
      const z = Math.sin(progress * Math.PI * 3 + i * 0.5) * 0.3 * (1 - progress * 0.7);

      posAttr.setXYZ(i, x + spiral * 0.5, y + spiral, z);

      // Fade: bright at source, dim mid, bright at convergence
      const fade = progress < 0.1
        ? progress / 0.1
        : progress > 0.85
          ? (1 - progress) / 0.15
          : 0.4 + Math.sin(progress * Math.PI) * 0.3;

      colAttr.setXYZ(i,
        source.color.r * fade,
        source.color.g * fade,
        source.color.b * fade,
      );
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
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// --- Connection Lines (faint) ---
function ConnectionLines() {
  const linesRef = useRef<THREE.Group>(null);

  const geometries = useMemo(() => {
    return SOURCES.map((source) => {
      const curve = new THREE.CatmullRomCurve3([
        source.pos.clone(),
        new THREE.Vector3(
          source.pos.x * 0.3 + (Math.random() - 0.5) * 0.5,
          source.pos.y * 0.3 + (Math.random() - 0.5) * 0.5,
          0
        ),
        CONVERGENCE_POINT.clone(),
      ]);
      return new THREE.TubeGeometry(curve, 20, 0.008, 4, false);
    });
  }, []);

  useFrame(({ clock }) => {
    if (!linesRef.current) return;
    const t = clock.getElapsedTime();
    linesRef.current.children.forEach((child: THREE.Object3D, i: number) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.08 + Math.sin(t * 1.5 + i * 1.2) * 0.04;
      }
    });
  });

  return (
    <group ref={linesRef}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshBasicMaterial
            color={SOURCES[i].color}
            transparent
            opacity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Ambient Dots (background depth) ---
function AmbientDots() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = t * 0.01;
    const posAttr = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      posAttr.setY(i, y + Math.sin(t * 0.3 + i) * 0.0005);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.03}
        color="#1a3a5c"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// --- Main Scene ---
function Scene() {
  return (
    <>
      <color attach="background" args={["#050a14"]} />
      <AmbientDots />
      <ConnectionLines />
      <FlowParticles />
      {SOURCES.map((source, i) => (
        <SourceOrb key={i} position={source.pos} color={source.color} />
      ))}
      <ConvergenceCore />
      <SignalBeam />
    </>
  );
}

// --- Exported Component ---
export default function SignalFlow3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050a14" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
