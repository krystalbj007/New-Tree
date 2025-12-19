
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChristmasTreeProps {
  mode: 'TREE' | 'EXPLODE';
  rotationRef: React.MutableRefObject<number>;
}

// 移动端优化：减少粒子数量以提高性能
const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const ORNAMENT_COUNT = isMobile ? 30 : 60;
const TREE_PARTICLE_COUNT = isMobile ? 5000 : 15000;
const GROUND_PARTICLE_COUNT = isMobile ? 3000 : 8000;
const STAR_GLOW_COUNT = isMobile ? 100 : 220; 

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ mode, rotationRef }) => {
  const starRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const ornamentsGroupRef = useRef<THREE.Group>(null);
  const groundParticlesRef = useRef<THREE.Points>(null);
  const starAuraRef = useRef<THREE.Points>(null);
  const currentRotation = useRef(0);

  const hexagonTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const sides = 6;
      const size = 60;
      const centerX = 64;
      const centerY = 64;
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        const x = centerX + size * Math.cos(angle);
        const y = centerY + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'white';
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { 
    treePositions, 
    explodePositions, 
    colors, 
    ornamentData, 
    groundData,
    starGlowData
  } = useMemo(() => {
    const tree = new Float32Array(TREE_PARTICLE_COUNT * 3);
    const explode = new Float32Array(TREE_PARTICLE_COUNT * 3);
    const cls = new Float32Array(TREE_PARTICLE_COUNT * 3);
    const orn = [];
    
    const colorGold = new THREE.Color("#FFD700");
    const colorWhite = new THREE.Color("#FFFFFF");
    const colorPink = new THREE.Color("#FF69B4");
    const colorPurple = new THREE.Color("#8A2BE2");

    for (let i = 0; i < TREE_PARTICLE_COUNT; i++) {
      const t = Math.random(); 
      const height = 12.5;
      const turns = 12;
      const angle = t * turns * Math.PI * 2 + (Math.random() * 0.7);
      const radiusBase = Math.pow(1 - t, 0.85) * 3.4;
      const radius = radiusBase * (0.8 + Math.random() * 0.45); 
      
      tree[i * 3] = Math.cos(angle) * radius;
      tree[i * 3 + 1] = t * height;
      tree[i * 3 + 2] = Math.sin(angle) * radius;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const r = 10 + Math.random() * 12; 
      explode[i * 3] = Math.sin(theta) * Math.cos(phi) * r;
      explode[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * (r * 0.5) + 6; 
      explode[i * 3 + 2] = Math.cos(theta) * r;

      const rand = Math.random();
      const mixColor = rand > 0.8 ? colorWhite : (rand > 0.6 ? colorGold : (rand > 0.3 ? colorPink : colorPurple));
      cls[i * 3] = mixColor.r;
      cls[i * 3 + 1] = mixColor.g;
      cls[i * 3 + 2] = mixColor.b;
    }

    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const t = Math.pow(i / ORNAMENT_COUNT, 1.4); 
      const angle = t * 10 * Math.PI * 2 + Math.random() * 0.5;
      const radius = Math.pow(1 - t, 0.75) * 3.8; 
      const treePos = new THREE.Vector3(Math.cos(angle) * radius, t * 12.2, Math.sin(angle) * radius);
      const explodeR = 12 + Math.random() * 10;
      const explodePhi = Math.random() * Math.PI * 2;
      const explodePos = new THREE.Vector3(Math.cos(explodePhi) * explodeR, Math.random() * 18, Math.sin(explodePhi) * explodeR);
      const scale = Math.max(0.18, (1.2 - t) * 0.38 * (0.9 + Math.random() * 0.3));

      orn.push({ treePos, explodePos, color: i % 3 === 0 ? "#FF69B4" : (i % 3 === 1 ? "#FFD700" : "#FFFFFF"), scale });
    }

    const gPos = new Float32Array(GROUND_PARTICLE_COUNT * 3);
    const gCol = new Float32Array(GROUND_PARTICLE_COUNT * 3);
    const darkBlue = new THREE.Color("#050520");
    const deepPurple = new THREE.Color("#100220");
    for (let i = 0; i < GROUND_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 20; 
      gPos[i * 3] = Math.cos(angle) * r;
      gPos[i * 3 + 1] = (Math.random() - 0.5) * 0.2; 
      gPos[i * 3 + 2] = Math.sin(angle) * r;
      const c = new THREE.Color().lerpColors(darkBlue, deepPurple, Math.random());
      gCol[i * 3] = c.r; gCol[i * 3 + 1] = c.g; gCol[i * 3 + 2] = c.b;
    }

    const starGP = new Float32Array(STAR_GLOW_COUNT * 3);
    const starGCol = new Float32Array(STAR_GLOW_COUNT * 3);
    const starGIntensities = new Float32Array(STAR_GLOW_COUNT); 
    const starGOffsets = new Float32Array(STAR_GLOW_COUNT); 
    const starGSpeeds = new Float32Array(STAR_GLOW_COUNT);
    
    const maxR = 4.5;
    for (let i = 0; i < STAR_GLOW_COUNT; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const r = maxR * Math.pow(Math.random(), 5.5);
      
      starGP[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      starGP[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      starGP[i * 3 + 2] = r * Math.cos(theta);
      
      starGIntensities[i] = Math.pow(1 - (r / maxR), 4.5);
      starGOffsets[i] = Math.random() * Math.PI * 2;
      starGSpeeds[i] = 3.0 + Math.random() * 6.0; 
    }

    return { 
      treePositions: tree, explodePositions: explode, colors: cls, ornamentData: orn, groundData: { pos: gPos, col: gCol },
      starGlowData: { pos: starGP, intensities: starGIntensities, offsets: starGOffsets, speeds: starGSpeeds, currentColors: starGCol }
    };
  }, []);

  const currentPositions = useMemo(() => new Float32Array(treePositions), []);
  const starBaseColor = useMemo(() => new THREE.Color("#FFD700"), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const isTree = mode === 'TREE';

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const target = isTree ? treePositions : explodePositions;
      for (let i = 0; i < TREE_PARTICLE_COUNT * 3; i++) {
        currentPositions[i] = THREE.MathUtils.lerp(currentPositions[i], target[i], isTree ? 0.07 : 0.035);
      }
      posAttr.needsUpdate = true;
      currentRotation.current = THREE.MathUtils.lerp(currentRotation.current, rotationRef.current, 0.08);
      pointsRef.current.rotation.y = time * 0.05 + currentRotation.current;
    }

    if (ornamentsGroupRef.current) {
      ornamentsGroupRef.current.rotation.y = time * 0.05 + currentRotation.current;
      ornamentsGroupRef.current.children.forEach((child, i) => {
        child.position.lerp(isTree ? ornamentData[i].treePos : ornamentData[i].explodePos, 0.07);
      });
    }

    if (starAuraRef.current) {
      const colAttr = starAuraRef.current.geometry.attributes.color;
      const mat = starAuraRef.current.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, isTree ? 1 : 0, 0.05);

      for (let i = 0; i < STAR_GLOW_COUNT; i++) {
        const distWeight = starGlowData.intensities[i];
        const flicker = 0.02 + 0.98 * Math.pow(Math.abs(Math.sin(time * starGlowData.speeds[i] + starGlowData.offsets[i])), 14);
        const finalIntensity = distWeight * flicker;
        colAttr.setXYZ(i, starBaseColor.r * finalIntensity, starBaseColor.g * finalIntensity, starBaseColor.b * finalIntensity);
      }
      colAttr.needsUpdate = true;
      starAuraRef.current.rotation.y = time * 0.4;
    }

    if (starRef.current) {
      starRef.current.rotation.y = time * 1.5;
      starRef.current.parent!.position.y = THREE.MathUtils.lerp(starRef.current.parent!.position.y, 12.8, 0.08);
      if (starRef.current.material instanceof THREE.MeshStandardMaterial) {
        starRef.current.material.opacity = THREE.MathUtils.lerp(starRef.current.material.opacity, isTree ? 1 : 0, 0.1);
      }
    }
  });

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 0.45, innerRadius = 0.18;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      shape.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      const innerAngle = angle + Math.PI / 5;
      shape.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
    }
    shape.closePath();
    return shape;
  }, []);

  return (
    <group position={[0, -5.5, 0]}>
      <points ref={groundParticlesRef} position={[0, -0.2, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={groundData.pos.length / 3} array={groundData.pos} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={groundData.col.length / 3} array={groundData.col} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} vertexColors transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
      </points>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TREE_PARTICLE_COUNT} array={currentPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={TREE_PARTICLE_COUNT} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.16} map={hexagonTexture} vertexColors transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} alphaTest={0.01} />
      </points>

      <group ref={ornamentsGroupRef}>
        {ornamentData.map((data, i) => (
          <mesh key={i} position={data.treePos.toArray() as [number, number, number]} scale={data.scale}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.15} roughness={0.05} metalness={1.0} />
          </mesh>
        ))}
      </group>

      <group position={[0, 12.8, 0]}>
        <points ref={starAuraRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={STAR_GLOW_COUNT} array={starGlowData.pos} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={STAR_GLOW_COUNT} array={starGlowData.currentColors} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.32} map={particleTexture} vertexColors transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
        </points>
      </group>

      <group position={[0, 12.8, 0]}>
        <mesh ref={starRef}>
          <extrudeGeometry args={[starShape, { steps: 1, depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 }]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFD700" emissiveIntensity={8} transparent />
          <pointLight intensity={mode === 'TREE' ? 15 : 0} distance={20} color="#FFD700" />
        </mesh>
      </group>
    </group>
  );
};

export default ChristmasTree;
