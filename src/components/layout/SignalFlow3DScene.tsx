"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type MeshWithBasicMaterial = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

const TERMINAL_ROWS = [
  "#00d4ff",
  "#ff8800",
  "#00e5a8",
  "#5f7cff",
  "#f6c85f",
  "#ff4d5e",
];

function makeLine(points: THREE.Vector3[], color: string, opacity = 0.45) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

function TerminalBootWall() {
  const group = useRef<THREE.Group>(null);
  const bars = useMemo(() => {
    return Array.from({ length: 112 }, (_, index) => {
      const column = index % 16;
      const row = Math.floor(index / 16);
      const color = TERMINAL_ROWS[(row + column) % TERMINAL_ROWS.length];
      return {
        x: -4.9 + column * 0.65,
        y: 2.55 - row * 0.34,
        width: 0.16 + ((index * 17) % 10) * 0.035,
        color,
        delay: index * 0.045,
        phase: (row * 0.16 + column * 0.035) % 1,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.z = -2.4 + Math.sin(t * 0.16) * 0.12;
    group.current.rotation.y = Math.sin(t * 0.08) * 0.035;

    group.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh)) return;
      const bar = bars[index];
      const mesh = child as MeshWithBasicMaterial;
      const boot = Math.min(1, Math.max(0, t * 0.38 - bar.phase));
      const scan = 0.58 + Math.sin(t * 1.35 + bar.delay) * 0.3;
      mesh.scale.x = 0.35 + boot * scan;
      mesh.material.opacity = 0.05 + boot * (0.18 + scan * 0.22);
    });
  });

  return (
    <group ref={group} position={[0, 0.4, -2.4]} rotation={[0, -0.04, 0]}>
      {bars.map((bar, index) => (
        <mesh key={index} position={[bar.x, bar.y, 0]}>
          <boxGeometry args={[bar.width, 0.055, 0.01]} />
          <meshBasicMaterial color={bar.color} transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function TerminalGrid() {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const output: THREE.Line[] = [];
    for (let i = -10; i <= 10; i += 1) {
      output.push(makeLine([
        new THREE.Vector3(i * 0.75, -2.7, -4.5),
        new THREE.Vector3(i * 0.75, -2.7, 4.5),
      ], "#17314b", 0.16));
      output.push(makeLine([
        new THREE.Vector3(-7.5, -2.7, i * 0.45),
        new THREE.Vector3(7.5, -2.7, i * 0.45),
      ], "#17314b", 0.12));
    }
    return output;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.z = ((clock.getElapsedTime() * 0.24) % 1) * -0.35;
  });

  return (
    <group ref={group} rotation={[-0.78, 0, 0]}>
      {lines.map((line, index) => <primitive key={index} object={line} />)}
    </group>
  );
}

function SignalTunnel() {
  const group = useRef<THREE.Group>(null);
  const streams = useMemo(() => {
    return Array.from({ length: 24 }, (_, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const y = -1.45 + (lane % 12) * 0.26;
      const color = TERMINAL_ROWS[index % TERMINAL_ROWS.length];
      const z = -0.45 + ((index * 7) % 12) * 0.055;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (5.5 + lane * 0.025), y * 1.28, z),
        new THREE.Vector3(side * 2.85, y * 0.72, z + 0.34),
        new THREE.Vector3(side * 1.08, y * 0.28, z + 0.08),
        new THREE.Vector3(side * 0.2, 0.04, z),
      ]);
      return { curve, color, delay: index * 0.08 };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Group)) return;
      const marker = child.children[1] as MeshWithBasicMaterial;
      const progress = (t * 0.105 + streams[index].delay) % 1;
      marker.position.copy(streams[index].curve.getPoint(progress));
      marker.scale.setScalar(0.45 + Math.sin(progress * Math.PI) * 0.9);
      marker.material.opacity = 0.18 + Math.sin(progress * Math.PI) * 0.56;
    });
  });

  return (
    <group ref={group}>
      {streams.map((stream, index) => (
        <group key={index}>
          <primitive object={makeLine(stream.curve.getPoints(72), stream.color, 0.2)} />
          <mesh>
            <boxGeometry args={[0.12, 0.12, 0.025]} />
            <meshBasicMaterial color={stream.color} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DecisionCore() {
  const core = useRef<THREE.Group>(null);
  const rings = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => ({
      scale: 0.92 + index * 0.28,
      color: index % 2 === 0 ? "#ff8800" : "#00d4ff",
      opacity: 0.2 - index * 0.032,
      speed: 0.14 + index * 0.035,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!core.current) return;
    const t = clock.getElapsedTime();
    core.current.rotation.z = Math.sin(t * 0.12) * 0.04;
    core.current.rotation.y = Math.sin(t * 0.2) * 0.12;
    core.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mesh = child as MeshWithBasicMaterial;
      const pulse = 0.88 + Math.sin(t * (0.8 + index * 0.08) + index) * 0.08;
      mesh.scale.setScalar(pulse);
      mesh.material.opacity = index === 0 ? 0.64 + Math.sin(t * 1.4) * 0.08 : mesh.material.opacity;
    });
  });

  return (
    <group ref={core} position={[0, 0.02, 0.18]}>
      <mesh>
        <boxGeometry args={[1.1, 1.1, 0.08]} />
        <meshBasicMaterial color="#08111d" transparent opacity={0.68} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.1, 1.1, 0.06]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.12} />
      </mesh>
      {rings.map((ring, index) => (
        <mesh key={index} rotation={[0, 0, index * Math.PI / 6]}>
          <torusGeometry args={[ring.scale, 0.008, 8, 72]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[0.18, 1.55, 0.02]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.18, 1.55, 0.02]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function DepthParticles() {
  const group = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 64 }, (_, index) => ({
      x: -5.8 + ((index * 37) % 116) / 10,
      y: -2.55 + ((index * 19) % 52) / 10,
      z: -2.2 + ((index * 29) % 42) / 10,
      color: TERMINAL_ROWS[index % TERMINAL_ROWS.length],
      delay: index * 0.033,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh)) return;
      const particle = particles[index];
      const mesh = child as MeshWithBasicMaterial;
      mesh.position.z = ((particle.z + t * 0.16) % 2.8) - 1.4;
      mesh.material.opacity = 0.06 + Math.sin(t * 0.7 + particle.delay) * 0.04;
    });
  });

  return (
    <group ref={group}>
      {particles.map((particle, index) => (
        <mesh key={index} position={[particle.x, particle.y, particle.z]}>
          <boxGeometry args={[0.018, 0.018, 0.018]} />
          <meshBasicMaterial color={particle.color} transparent opacity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <DepthParticles />
      <TerminalBootWall />
      <TerminalGrid />
      <SignalTunnel />
      <DecisionCore />
    </>
  );
}

export default function SignalFlow3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.08, 7.1], fov: 41 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#030712" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
