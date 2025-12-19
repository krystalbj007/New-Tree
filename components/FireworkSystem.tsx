
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COLOR_PALETTES = [
  ["#FFD700", "#FFFACD", "#FFFFFF"], 
  ["#FF69B4", "#FFB6C1", "#FFFFFF"], 
  ["#00FFFF", "#E0FFFF", "#FFFFFF"], 
  ["#C0C0C0", "#E8E8E8", "#FFFFFF"], 
];

const easeOutExpo = (x: number): number => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  size: number;
  flickerOffset: number;
  color: THREE.Color;
}

interface TrailPoint {
  pos: THREE.Vector3;
  life: number;
  size: number;
  opacity: number;
}

const SingleFirework: React.FC<{ 
  startX: number; 
  targetY: number; 
  palette: string[]; 
  onComplete: () => void 
}> = ({ startX, targetY, palette, onComplete }) => {
  const [phase, setPhase] = useState<'launch' | 'burst'>('launch');
  const rocketRef = useRef<THREE.Group>(null);
  const burstRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const trailParticles = useRef<TrailPoint[]>([]);
  const trailRef = useRef<THREE.Points>(null);

  const particleCount = 600; 
  const burstParticles = useMemo(() => {
    const pts: Particle[] = [];
    const baseColor = new THREE.Color(palette[0]);
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      // 降低初始速度以缩小扩散半径
      const speed = 0.06 + Math.random() * 0.12;
      pts.push({
        pos: new THREE.Vector3(0, 0, 0),
        vel: new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi) * speed,
          Math.sin(theta) * Math.sin(phi) * speed,
          Math.cos(theta) * speed
        ),
        life: 1.0,
        size: 0.04 + Math.random() * 0.1,
        flickerOffset: Math.random() * 10,
        color: baseColor.clone().lerp(new THREE.Color(palette[Math.floor(Math.random() * palette.length)]), 0.5)
      });
    }
    return pts;
  }, [palette]);

  const posArray = useMemo(() => new Float32Array(particleCount * 3), []);
  const colArray = useMemo(() => new Float32Array(particleCount * 3), []);
  const sizeArray = useMemo(() => new Float32Array(particleCount), []);

  const launchProgress = useRef(0);
  const startY = -6;

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (phase === 'launch') {
      launchProgress.current += delta * 0.8;
      const eased = easeOutExpo(Math.min(1, launchProgress.current));
      const currentY = THREE.MathUtils.lerp(startY, targetY, eased);
      if (rocketRef.current) rocketRef.current.position.set(startX, currentY, -5);
      if (Math.random() > 0.1) {
        trailParticles.current.push({
          pos: new THREE.Vector3(startX + (Math.random()-0.5)*0.1, currentY, -5 + (Math.random()-0.5)*0.1),
          life: 1.0, size: 0.02 + Math.random() * 0.04, opacity: 0.8
        });
      }
      if (lightRef.current) {
        lightRef.current.position.set(startX, currentY, -5);
        lightRef.current.intensity = 40 * (1 - eased);
      }
      if (launchProgress.current >= 1) setPhase('burst');
    }

    if (trailRef.current) {
      const trailPos = trailRef.current.geometry.attributes.position;
      const trailSizes = trailRef.current.geometry.attributes.size;
      for (let i = 0; i < 500; i++) { 
        const p = trailParticles.current[i];
        if (p && p.life > 0) {
          p.life -= delta * 1.8; p.pos.y -= delta * 0.3; 
          trailPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
          trailSizes.setX(i, p.size * p.life);
        } else {
          trailPos.setXYZ(i, 0, -1000, 0);
        }
      }
      trailPos.needsUpdate = true; trailSizes.needsUpdate = true;
      if (trailParticles.current.length > 500) trailParticles.current = trailParticles.current.filter(p => p.life > 0).slice(0, 500);
    }

    if (phase === 'burst') {
      if (!burstRef.current) return;
      const posAttr = burstRef.current.geometry.attributes.position;
      const colAttr = burstRef.current.geometry.attributes.color;
      const sizeAttr = burstRef.current.geometry.attributes.size;
      let allDead = true;

      burstParticles.forEach((p, i) => {
        if (p.life > 0) {
          allDead = false;
          // 增加速度衰减阻力 (从 0.96 降至 0.94)，使粒子扩散范围更紧凑
          p.life -= delta * 0.6; p.vel.multiplyScalar(0.94); p.vel.y -= 0.0007; p.pos.add(p.vel);
          const worldX = p.pos.x + startX, worldY = p.pos.y + targetY, worldZ = p.pos.z - 5;
          posAttr.setXYZ(i, worldX, worldY, worldZ);
          if (p.life > 0.4 && Math.random() > 0.88) {
            trailParticles.current.push({ pos: new THREE.Vector3(worldX, worldY, worldZ), life: 0.6, size: p.size * 0.5, opacity: 0.4 });
          }
          const twinkle = Math.pow(Math.abs(Math.sin(time * 45 + p.flickerOffset)), 6);
          const fade = Math.pow(p.life, 2);
          colAttr.setXYZ(i, p.color.r * (1.2 + twinkle * 2.5) * fade, p.color.g * (1.2 + twinkle * 2.5) * fade, p.color.b * (1.2 + twinkle * 2.5) * fade);
          sizeAttr.setX(i, p.size * (1.0 + twinkle * 3.0) * fade);
        } else {
          posAttr.setXYZ(i, 0, -1000, 0); 
        }
      });

      if (lightRef.current) {
        lightRef.current.intensity = Math.max(0, burstParticles[0].life * 100);
        lightRef.current.position.set(startX, targetY, -5);
      }
      posAttr.needsUpdate = true; colAttr.needsUpdate = true; sizeAttr.needsUpdate = true;
      if (allDead && trailParticles.current.every(p => p.life <= 0)) onComplete();
    }
  });

  return (
    <group>
      <pointLight ref={lightRef} color={palette[0]} distance={25} decay={2} />
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={500} array={new Float32Array(500 * 3)} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={500} array={new Float32Array(500)} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial size={0.12} color={palette[0]} transparent blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
      </points>
      {phase === 'burst' && (
        <points ref={burstRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={particleCount} array={posArray} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={particleCount} array={colArray} itemSize={3} />
            <bufferAttribute attach="attributes-size" count={particleCount} array={sizeArray} itemSize={1} />
          </bufferGeometry>
          <pointsMaterial size={0.12} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
        </points>
      )}
    </group>
  );
};

const FireworkSystem: React.FC<{ triggerCount: number }> = ({ triggerCount }) => {
  const [activeFireworks, setActiveFireworks] = useState<{ id: number; startX: number; targetY: number; palette: string[] }[]>([]);
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (triggerCount > lastTrigger.current) {
      lastTrigger.current = triggerCount;
      const burstCount = 1 + Math.floor(Math.random() * 2);
      const newFireworks = Array.from({ length: burstCount }).map((_, i) => ({
        id: Date.now() + i + Math.random(),
        // 缩小烟火发射的水平随机跨度 (从 14 缩至 8)
        startX: (Math.random() - 0.5) * 8, 
        targetY: 6 + Math.random() * 5, 
        palette: COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]
      }));
      setActiveFireworks(prev => [...prev, ...newFireworks]);
    }
  }, [triggerCount]);

  return (
    <group>
      {activeFireworks.map(fw => (
        <SingleFirework key={fw.id} startX={fw.startX} targetY={fw.targetY} palette={fw.palette} onComplete={() => setActiveFireworks(prev => prev.filter(f => f.id !== fw.id))} />
      ))}
    </group>
  );
};

export default FireworkSystem;
