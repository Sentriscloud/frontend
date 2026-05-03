"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

function mkEnvMap() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s * 4;
  c.height = s * 2;
  const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, 0, s * 2);
  bg.addColorStop(0, "#3A2810");
  bg.addColorStop(0.3, "#28180c");
  bg.addColorStop(0.5, "#1a1208");
  bg.addColorStop(0.7, "#28180c");
  bg.addColorStop(1, "#3A2810");
  x.fillStyle = bg;
  x.fillRect(0, 0, s * 4, s * 2);
  const spots: [number, number, number, string][] = [
    [s * 1.2, s * 0.3, s * 0.8, "rgba(220,180,80,.35)"],
    [s * 3, s * 0.5, s * 0.55, "rgba(240,208,128,.25)"],
    [s * 2, s * 1.7, s * 0.4, "rgba(200,168,74,.18)"],
    [s * 0.3, s * 1, s * 0.9, "rgba(255,255,240,.1)"],
    [s * 3.5, s * 0.2, s * 0.3, "rgba(240,208,128,.25)"],
    [s * 2, s * 0.3, s * 0.6, "rgba(255,240,200,.15)"],
  ];
  spots.forEach(([px, py, rr, cl]) => {
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, cl);
    g.addColorStop(1, "transparent");
    x.fillStyle = g;
    x.fillRect(0, 0, s * 4, s * 2);
  });
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

function DiamondCoin() {
  const coinRef = useRef<THREE.Group>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);
  const env = useMemo(() => mkEnvMap(), []);

  const goldMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xc8a84a,
        metalness: 1,
        roughness: 0.12,
        clearcoat: 0.6,
        clearcoatRoughness: 0.05,
        envMap: env,
        envMapIntensity: 1.8,
      }),
    [env]
  );

  const darkMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x0c0c10,
        metalness: 0.85,
        roughness: 0.18,
        clearcoat: 0.5,
        envMap: env,
        envMapIntensity: 1.2,
      }),
    [env]
  );

  const sTex = useMemo(() => {
    const sc = document.createElement("canvas");
    sc.width = 128;
    sc.height = 128;
    const sx = sc.getContext("2d")!;
    sx.clearRect(0, 0, 128, 128);
    sx.font = 'bold 72px "Playfair Display", serif';
    sx.textAlign = "center";
    sx.textBaseline = "middle";
    sx.fillStyle = "#F0D080";
    sx.shadowColor = "rgba(240,208,128,0.8)";
    sx.shadowBlur = 12;
    sx.fillText("S", 64, 66);
    return new THREE.CanvasTexture(sc);
  }, []);

  const outerDiamond = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.5);
    shape.lineTo(0.5, 0);
    shape.lineTo(0, -0.5);
    shape.lineTo(-0.5, 0);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0, 0.42);
    hole.lineTo(0.42, 0);
    hole.lineTo(0, -0.42);
    hole.lineTo(-0.42, 0);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
  }, []);

  const innerDiamond = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.22);
    shape.lineTo(0.22, 0);
    shape.lineTo(0, -0.22);
    shape.lineTo(-0.22, 0);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  }, []);

  const cornerDotGeo = useMemo(() => new THREE.SphereGeometry(0.025, 12, 12), []);
  const cornerDotMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xf0d080,
        metalness: 1,
        roughness: 0.08,
        emissive: 0xf0d080,
        emissiveIntensity: 0.2,
        envMap: env,
        envMapIntensity: 1.5,
      }),
    [env]
  );

  const torusRingMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xc8a84a,
        metalness: 1,
        roughness: 0.15,
        clearcoat: 0.4,
        clearcoatRoughness: 0.08,
        envMap: env,
        envMapIntensity: 1.5,
      }),
    [env]
  );

  const accentRingMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xc8a84a,
        metalness: 1,
        roughness: 0.2,
        emissive: 0xc8a84a,
        emissiveIntensity: 0.08,
        envMap: env,
        envMapIntensity: 1.2,
      }),
    [env]
  );

  const corners = [
    { x: 0, y: 0.5 },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: -0.5, y: 0 },
  ];

  useFrame(({ clock }) => {
    if (!coinRef.current) return;
    const t = clock.getElapsedTime();
    // Smooth continuous rotation
    coinRef.current.rotation.y = t * 0.5;
    // Gentle tilt oscillation
    coinRef.current.rotation.x = Math.sin(t * 0.3) * 0.12;
    // Float up/down
    coinRef.current.position.y = Math.sin(t * 0.4) * 0.1;
    // Pulsing key light
    if (keyLightRef.current) {
      keyLightRef.current.intensity = 0.8 + Math.sin(t * 0.6) * 0.15;
    }
  });

  return (
    <>
      {/* Extra moving light that follows coin rotation for specular highlights */}
      <pointLight ref={keyLightRef} color="#F0D080" intensity={0.8} distance={8} position={[1, 1.5, 3]} />

      <group ref={coinRef} scale={0.55}>
        {/* Outer torus ring */}
        <mesh>
          <torusGeometry args={[1.35, 0.12, 48, 120]} />
          <primitive object={torusRingMat} attach="material" />
        </mesh>

        {/* Accent ring */}
        <mesh>
          <torusGeometry args={[1.0, 0.018, 24, 100]} />
          <primitive object={accentRingMat} attach="material" />
        </mesh>

        {/* Dark face */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.18, 1.18, 0.04, 80]} />
          <primitive object={darkMat} attach="material" />
        </mesh>

        {/* FRONT */}
        <mesh geometry={outerDiamond} material={goldMat} position={[0, 0, 0.02]} />
        <mesh geometry={innerDiamond} material={goldMat} position={[0, 0, 0.02]} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 24]} />
          <meshPhysicalMaterial color={0x0c0c10} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.28, 0.28]} />
          <meshBasicMaterial map={sTex} transparent depthWrite={false} />
        </mesh>
        {corners.map((p, i) => (
          <mesh key={`f${i}`} geometry={cornerDotGeo} material={cornerDotMat} position={[p.x, p.y, 0.05]} />
        ))}

        {/* BACK */}
        <mesh geometry={outerDiamond} material={goldMat} position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]} />
        <mesh geometry={innerDiamond} material={goldMat} position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]} />
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 24]} />
          <meshPhysicalMaterial color={0x0c0c10} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.28, 0.28]} />
          <meshBasicMaterial map={sTex} transparent depthWrite={false} />
        </mesh>
        {corners.map((p, i) => (
          <mesh key={`b${i}`} geometry={cornerDotGeo} material={cornerDotMat} position={[p.x, p.y, -0.05]} />
        ))}
      </group>
    </>
  );
}

function LightThemeBoost() {
  const { scene } = useThree();
  const extraLights = useRef<THREE.Light[]>([]);

  useEffect(() => {
    const check = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      extraLights.current.forEach((l) => scene.remove(l));
      extraLights.current = [];
      if (isLight) {
        const top = new THREE.DirectionalLight(0xffffff, 2);
        top.position.set(0, 5, 3);
        const rim = new THREE.DirectionalLight(0xfff0d0, 1.5);
        rim.position.set(-3, -2, 4);
        const front = new THREE.PointLight(0xfff8e8, 1, 10);
        front.position.set(0, 0, 3);
        scene.add(top, rim, front);
        extraLights.current = [top, rim, front];
      }
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { obs.disconnect(); extraLights.current.forEach((l) => scene.remove(l)); };
  }, [scene]);

  return null;
}

function CoinScene() {
  return (
    <>
      <ambientLight color="#1a1408" intensity={1.8} />
      <directionalLight color="#fff8e0" intensity={2.5} position={[3, 4, 5]} />
      <directionalLight color="#C8A84A" intensity={1} position={[-3, 1, -2]} />
      <pointLight color="#F0D080" intensity={1.2} distance={10} position={[0, 2, 3]} />
      <LightThemeBoost />
      <DiamondCoin />
    </>
  );
}

export function AboutCoin() {
  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[420px]">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 32 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.0,
          alpha: true,
        }}
        style={{ background: "transparent" }}
      >
        <CoinScene />
      </Canvas>
    </div>
  );
}
