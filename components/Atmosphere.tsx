
import React, { useRef } from 'react';
import { Stars, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Atmosphere: React.FC = () => {
  const auroraRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (auroraRef.current) {
      auroraRef.current.rotation.z = time * 0.02;
    }
  });

  return (
    <>
      <color attach="background" args={["#05020a"]} />
      <fog attach="fog" args={["#05020a", 5, 50]} />
      
      <Stars 
        radius={120} 
        depth={60} 
        count={3000} 
        factor={4} 
        saturation={1} 
        fade 
        speed={0.8} 
      />
      
      {/* Distant aurora-like glow */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={auroraRef} position={[0, 10, -30]} rotation={[0.2, 0, 0]}>
          <planeGeometry args={[100, 40]} />
          <meshBasicMaterial 
            color="#4B0082" 
            transparent 
            opacity={0.03} 
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>

      {/* Deep floor haze to enhance the dark particle ground contrast */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#020005" transparent opacity={0.6} />
      </mesh>
    </>
  );
};

export default Atmosphere;
