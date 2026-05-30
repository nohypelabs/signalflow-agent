"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SIGNAL_ROWS = [
  { y: 1.9, color: "#00d4ff", label: "SODEX TAPE" },
  { y: 1.15, color: "#ff8800", label: "CATALYSTS" },
  { y: 0.4, color: "#00e5a8", label: "TECHNICALS" },
  { y: -0.35, color: "#5f7cff", label: "RISK" },
  { y: -1.1, color: "#f6c85f", label: "AI THESIS" },
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

function TerminalFloor() {
  const group = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const output: THREE.Line[] = [];
    for (let i = -8; i <= 8; i += 1) {
      output.push(makeLine([
        new THREE.Vector3(i, -2.25, -4),
        new THREE.Vector3(i, -2.25, 4),
      ], "#17314b", 0.2));
      output.push(makeLine([
        new THREE.Vector3(-8, -2.25, i / 2),
        new THREE.Vector3(8, -2.25, i / 2),
      ], "#17314b", 0.16));
    }
    return output;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.z = ((clock.getElapsedTime() * 0.18) % 1) * -0.2;
  });

  return (
    <group ref={group} rotation={[-0.72, 0, 0]}>
      {lines.map((line, index) => <primitive key={index} object={line} />)}
    </group>
  );
}

function MarketTapeWall() {
  const group = useRef<THREE.Group>(null);
  const bars = useMemo(() => {
    return Array.from({ length: 56 }, (_, index) => {
      const column = index % 14;
      const row = Math.floor(index / 14);
      const positive = (index * 7 + row) % 5 !== 0;
      return {
        x: -4.9 + column * 0.34,
        y: 2.35 - row * 0.32,
        width: 0.12 + ((index * 13) % 9) * 0.025,
        positive,
        delay: index * 0.07,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mesh = child;
      const pulse = 0.65 + Math.sin(t * 1.2 + bars[index].delay) * 0.25;
      mesh.scale.x = pulse;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.32 + pulse * 0.28;
    });
  });

  return (
    <group ref={group} position={[0, 0, -1.4]} rotation={[0, -0.08, 0]}>
      {bars.map((bar, index) => (
        <mesh key={index} position={[bar.x, bar.y, 0]}>
          <boxGeometry args={[bar.width, 0.08, 0.01]} />
          <meshBasicMaterial
            color={bar.positive ? "#00e5a8" : "#ff4d5e"}
            transparent
            opacity={0.42}
          />
        </mesh>
      ))}
    </group>
  );
}

function SignalRails() {
  const group = useRef<THREE.Group>(null);
  const pulses = useMemo(() => SIGNAL_ROWS.map((row) => ({
    row,
    curve: new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.7, row.y, 0),
      new THREE.Vector3(-2.4, row.y * 0.82, 0.25),
      new THREE.Vector3(-0.72, row.y * 0.34, 0.1),
    ]),
  })), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Group)) return;
      const marker = child.children[1] as THREE.Mesh;
      const progress = (t * 0.12 + index * 0.18) % 1;
      const point = pulses[index].curve.getPoint(progress);
      marker.position.copy(point);
      (marker.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(progress * Math.PI) * 0.55;
    });
  });

  return (
    <group ref={group}>
      {pulses.map(({ row, curve }) => (
        <group key={row.label}>
          <primitive object={makeLine(curve.getPoints(64), row.color, 0.34)} />
          <mesh>
            <boxGeometry args={[0.14, 0.14, 0.02]} />
            <meshBasicMaterial color={row.color} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DecisionEngine() {
  const core = useRef<THREE.Group>(null);
  const needles = useMemo(() => {
    return Array.from({ length: 18 }, (_, index) => {
      const angle = (index / 18) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 0.85,
        y: Math.sin(angle) * 0.5,
        angle,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!core.current) return;
    const t = clock.getElapsedTime();
    core.current.rotation.y = Math.sin(t * 0.18) * 0.12;
    core.current.rotation.x = Math.sin(t * 0.14) * 0.05;
    core.current.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh) || index < 2) return;
      (child.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 1.4 + index * 0.4) * 0.12;
    });
  });

  return (
    <group ref={core} position={[0, 0.05, 0]}>
      <mesh>
        <boxGeometry args={[1.35, 1.35, 0.08]} />
        <meshBasicMaterial color="#08111d" transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[1.16, 1.16, 0.04]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.16} />
      </mesh>
      {needles.map((needle, index) => (
        <mesh key={index} position={[needle.x, needle.y, 0.08]} rotation={[0, 0, needle.angle]}>
          <boxGeometry args={[0.32, 0.012, 0.02]} />
          <meshBasicMaterial color={index % 3 === 0 ? "#ff8800" : "#00d4ff"} transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function ExecutionPath() {
  const group = useRef<THREE.Group>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.82, 0.02, 0),
    new THREE.Vector3(1.8, 0.08, 0.18),
    new THREE.Vector3(3.0, -0.1, 0.1),
    new THREE.Vector3(4.6, 0.08, 0),
  ]), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const marker = group.current.children[1] as THREE.Mesh;
    const progress = (t * 0.16) % 1;
    marker.position.copy(curve.getPoint(progress));
    marker.scale.setScalar(0.8 + Math.sin(progress * Math.PI) * 0.5);
  });

  return (
    <group ref={group}>
      <primitive object={makeLine(curve.getPoints(72), "#ff8800", 0.52)} />
      <mesh>
        <coneGeometry args={[0.1, 0.26, 4]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.86} />
      </mesh>
      <mesh position={[4.8, 0.1, 0]}>
        <boxGeometry args={[0.78, 0.42, 0.04]} />
        <meshBasicMaterial color="#00e5a8" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function DataPanels() {
  return (
    <group position={[0, -1.55, 0.15]}>
      {[
        ["LIVE TAPE", "-1.8", "#00d4ff"],
        ["RISK GATE", "0", "#ff8800"],
        ["ORDER READY", "1.8", "#00e5a8"],
      ].map(([label, x, color]) => (
        <group key={label} position={[Number(x), 0, 0]}>
          <mesh>
            <boxGeometry args={[1.32, 0.34, 0.025]} />
            <meshBasicMaterial color={color} transparent opacity={0.1} />
          </mesh>
          <mesh position={[0, -0.19, 0.01]}>
            <boxGeometry args={[0.92, 0.018, 0.01]} />
            <meshBasicMaterial color={color} transparent opacity={0.42} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <TerminalFloor />
      <MarketTapeWall />
      <SignalRails />
      <DecisionEngine />
      <ExecutionPath />
      <DataPanels />
    </>
  );
}

export default function SignalFlow3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.15, 7.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#030712" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
