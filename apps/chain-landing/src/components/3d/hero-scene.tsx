"use client";

// File-level disable: r3f's useFrame callback runs outside React's
// render cycle (rAF), but the React 19 immutability rule treats Three.js
// object mutation inside useFrame the same as render-time mutation.
// Direct mutation of camera/geometry/material from useFrame is the
// documented r3f pattern — converting to ref-then-mutate gymnastics
// adds zero safety. Scoped here, not whole-app.
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

class Line_ extends THREE.Line {}
extend({ Line_ });

/* ── Traveling Node (dot moving along orbit) ── */
function TravelingNode({ radius, phase, speed }: { radius: number; phase: number; speed: number }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const trailRefs = useRef<THREE.Sprite[]>([]);

  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(240,220,140,1)");
    g.addColorStop(0.12, "rgba(200,168,74,.8)");
    g.addColorStop(0.3, "rgba(200,168,74,.2)");
    g.addColorStop(1, "rgba(200,168,74,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * speed + phase;
    if (spriteRef.current) {
      spriteRef.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
    trailRefs.current.forEach((tsp, i) => {
      if (tsp) {
        const ta = angle - (i + 1) * 0.08 * Math.sign(speed);
        tsp.position.set(Math.cos(ta) * radius, Math.sin(ta) * radius, 0);
      }
    });
  });

  return (
    <>
      <sprite ref={spriteRef} scale={[0.12, 0.12, 1]}>
        <spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.7} />
      </sprite>
      {[1, 2, 3].map((tr) => (
        <sprite
          key={tr}
          ref={(el) => { if (el) trailRefs.current[tr - 1] = el; }}
          scale={[(0.07 / tr) * 1.5, (0.07 / tr) * 1.5, 1]}
        >
          <spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.15 / tr} />
        </sprite>
      ))}
    </>
  );
}

/* ── Orbital Ring ── */
function OrbitalRing({
  radius, tiltX, tiltZ, speed, opacity, nodes, nodeSpeed,
}: {
  radius: number; tiltX: number; tiltZ: number; speed: number; opacity: number; nodes: number; nodeSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#C8A84A", transparent: true, opacity }),
    [opacity]
  );

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += speed * 0.003;
  });

  const nodeElements = useMemo(() => {
    return Array.from({ length: nodes }, (_, n) => ({
      phase: (n / nodes) * Math.PI * 2,
      speed: nodeSpeed,
    }));
  }, [nodes, nodeSpeed]);

  return (
    <group ref={groupRef} rotation={[tiltX, 0, tiltZ]}>
      {/* @ts-expect-error extended primitive */}
      <line_ geometry={geometry} material={material} />
      {nodeElements.map((n, i) => (
        <TravelingNode key={i} radius={radius} phase={n.phase} speed={n.speed} />
      ))}
    </group>
  );
}

/* ── Particles ── */
function Particles({ count = 500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  // Random particle layout is computed once on mount via useState's lazy
  // initializer — useMemo with Math.random() trips the React 19
  // react-hooks/purity rule because memos can be discarded and re-run
  // during reconciliation, which would shuffle the field on every
  // re-render. useState init runs exactly once, which is what we want.
  const [{ positions, colors }] = useState(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = r * Math.cos(phi) - 4;
      const c = new THREE.Color().setHSL(0.1 + Math.random() * 0.03, 0.4, 0.08 + Math.random() * 0.18);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  });

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.12 + i) * 0.00004;
      arr[i * 3] += Math.cos(t * 0.1 + i * 0.7) * 0.00003;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} vertexColors transparent opacity={0.5} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/* ── Glow Sprite ── */
function GlowSprite({ position, scale, opacity = 0.8 }: { position: [number, number, number]; scale: number; opacity?: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(240,208,128,.35)");
    g.addColorStop(0.15, "rgba(200,168,74,.15)");
    g.addColorStop(0.4, "rgba(200,168,74,.04)");
    g.addColorStop(1, "rgba(200,168,74,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = opacity + Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
  });

  return (
    <sprite ref={ref} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  );
}

/* ── Mouse Parallax Camera ── */
function MouseParallax() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      mouse.current.x = (t.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (t.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useFrame(() => {
    camera.position.x += (mouse.current.x * 0.6 - camera.position.x) * 0.008;
    camera.position.y += (0.5 + mouse.current.y * 0.25 - camera.position.y) * 0.008;
    camera.lookAt(0.3, 0.2, 0);
  });

  return null;
}

/* ── Scene ── */
function Scene() {
  const orbits = [
    { radius: 2.8, tiltX: 0.4, tiltZ: 0.1, speed: 0.15, opacity: 0.07, nodes: 3, nodeSpeed: 0.4 },
    { radius: 3.8, tiltX: -0.3, tiltZ: 0.6, speed: -0.1, opacity: 0.05, nodes: 2, nodeSpeed: -0.35 },
    { radius: 4.5, tiltX: 0.15, tiltZ: -0.25, speed: 0.08, opacity: 0.04, nodes: 4, nodeSpeed: 0.25 },
    { radius: 2.0, tiltX: -0.5, tiltZ: 0.35, speed: -0.12, opacity: 0.06, nodes: 2, nodeSpeed: -0.5 },
    { radius: 5.5, tiltX: 0.25, tiltZ: 0.45, speed: 0.06, opacity: 0.03, nodes: 3, nodeSpeed: 0.18 },
  ];

  return (
    <>
      <ambientLight color="#0c0a08" intensity={0.6} />
      <pointLight color="#C8A84A" intensity={0.5} distance={20} position={[2, 3, 4]} />
      <pointLight color="#F0D080" intensity={0.3} distance={18} position={[-3, -1, 3]} />
      <pointLight color="#C8A84A" intensity={0.2} distance={25} position={[0, 6, -2]} />

      <GlowSprite position={[1.5, 0.5, -2]} scale={8} />
      <GlowSprite position={[-3, 2, -4]} scale={5} opacity={0.4} />

      {orbits.map((o, i) => (
        <OrbitalRing key={i} {...o} />
      ))}
      <Particles />
      <MouseParallax />
    </>
  );
}

/* ── Theme watcher — keep dark clear color always so particles are visible ── */
function ThemeSync() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(0x0c0c10);
  }, [gl]);
  return null;
}

/* ── Export ── */
export function HeroScene() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 transition-opacity duration-500"
      style={{ opacity: isLight ? 0.5 : 1 }}
      id="hero-canvas-wrapper"
    >
      <Canvas
        camera={{ position: [0, 0.5, 10], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <ThemeSync />
        <Scene />
      </Canvas>
    </div>
  );
}
