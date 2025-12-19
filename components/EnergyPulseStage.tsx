
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RING_COUNT = 6; // More rings for smoother ripple propagation
const PARTICLES_PER_RING = 1200; 

const EnergyPulseStage: React.FC<{ active: boolean }> = ({ active }) => {
  const ringsRef = useRef<THREE.Group>(null);

  const ringData = useMemo(() => {
    return Array.from({ length: RING_COUNT }).map((_, ringIndex) => {
      const positions = new Float32Array(PARTICLES_PER_RING * 3);
      const colors = new Float32Array(PARTICLES_PER_RING * 3);
      
      const baseBlue = new THREE.Color("#1e40af"); 
      const cyanHighlight = new THREE.Color("#60a5fa"); 

      // Closer initial spacing for a more continuous "water surface" look
      const baseRadius = 6.5 + ringIndex * 1.2;

      for (let i = 0; i < PARTICLES_PER_RING; i++) {
        const angle = (i / PARTICLES_PER_RING) * Math.PI * 2;
        
        // Slightly tighter thickness per ring to make the wave clear
        const thickness = 1.5; 
        const r = baseRadius + (Math.random() - 0.5) * thickness;
        
        positions[i * 3] = Math.cos(angle) * r;
        // Ultra flat for the "stage" effect
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.03; 
        positions[i * 3 + 2] = Math.sin(angle) * r;

        const mixFactor = Math.random();
        const c = new THREE.Color().lerpColors(baseBlue, cyanHighlight, mixFactor);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      return { positions, colors };
    });
  }, []);

  useFrame((state) => {
    if (!ringsRef.current) return;
    const time = state.clock.getElapsedTime();
    
    ringsRef.current.children.forEach((child, i) => {
      const points = child as THREE.Points;
      const mat = points.material as THREE.PointsMaterial;
      
      // Water Ripple Animation Logic:
      // We use a traveling wave formula: sin(frequency * time - phase_shift * index)
      // The negative sign on the index term creates the outward movement.
      const rippleFreq = 0.4; // Slower time speed
      const spatialFreq = 1.2; // Spacing between wave crests
      const wave = Math.sin(time * rippleFreq - i * spatialFreq);
      
      // Slight outward scale shift based on wave
      const rippleScale = 1 + wave * 0.035;
      points.scale.set(rippleScale, 1, rippleScale);
      
      // Brightness/Opacity follows the wave for a visual "pulse" moving out
      const baseOpacity = active ? 0.4 : 0;
      // Map wave (-1 to 1) to a slight opacity boost (0 to 1)
      const waveIntensity = (wave + 1) * 0.5;
      const opacityTarget = baseOpacity + waveIntensity * 0.2;
      
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, opacityTarget, 0.05);
      
      // Even slower rotation for a calm atmosphere
      points.rotation.y = time * 0.01 * (i % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <group ref={ringsRef} position={[0, -5.5, 0]}>
      {ringData.map((data, idx) => (
        <points key={idx}>
          <bufferGeometry>
            <bufferAttribute 
              attach="attributes-position" 
              count={PARTICLES_PER_RING} 
              array={data.positions} 
              itemSize={3} 
            />
            <bufferAttribute 
              attach="attributes-color" 
              count={PARTICLES_PER_RING} 
              array={data.colors} 
              itemSize={3} 
            />
          </bufferGeometry>
          <pointsMaterial 
            size={0.14} // Slightly larger for better density
            vertexColors 
            transparent 
            opacity={0} 
            blending={THREE.AdditiveBlending} 
            depthWrite={false} 
            sizeAttenuation={true} 
          />
        </points>
      ))}
    </group>
  );
};

export default EnergyPulseStage;
