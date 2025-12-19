
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowSystemProps {
  active: boolean;
}

const SnowSystem: React.FC<SnowSystemProps> = ({ active }) => {
  const count = 6000; // Increased count for denser snow
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const [opacity, setOpacity] = useState(0);

  // Procedurally create a circle texture for round snow dots
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Handle smooth opacity transitions for fade-in and fade-out
  useFrame((state, delta) => {
    const fadeSpeed = 0.4; 
    if (active && opacity < 1) {
      setOpacity(Math.min(1, opacity + delta * fadeSpeed));
    } else if (!active && opacity > 0) {
      setOpacity(Math.max(0, opacity - delta * fadeSpeed));
    }
    
    if (materialRef.current) {
      materialRef.current.opacity = opacity;
    }
  });

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const drifts = new Float32Array(count);

    const colorWhite = new THREE.Color("#FFFFFF");
    const colorPink = new THREE.Color("#FFF5F8"); 

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 50 - 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      const mix = Math.random() > 0.85 ? colorPink : colorWhite;
      colors[i * 3] = mix.r;
      colors[i * 3 + 1] = mix.g;
      colors[i * 3 + 2] = mix.b;

      // Gentle drift velocities
      velocities[i] = 0.003 + Math.random() * 0.007;
      drifts[i] = Math.random() * Math.PI * 2;
    }
    return { positions, colors, velocities, drifts };
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current || opacity <= 0) return;
    
    const posAttr = meshRef.current.geometry.attributes.position;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      y -= particles.velocities[i];
      
      if (y < -20) y = 30;
      posAttr.setY(i, y);
      
      let x = posAttr.getX(i);
      x += Math.sin(time * 0.3 + particles.drifts[i]) * 0.003;
      posAttr.setX(i, x);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={particles.positions} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={count} 
          array={particles.colors} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        ref={materialRef}
        size={0.05}
        map={circleTexture}
        vertexColors
        transparent 
        opacity={0} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
        alphaTest={0.01}
      />
    </points>
  );
};

export default SnowSystem;
