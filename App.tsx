
import React, { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette, Noise } from '@react-three/postprocessing';
import { PerspectiveCamera, Environment, OrbitControls } from '@react-three/drei';
import ChristmasTree from './components/ChristmasTree';
import SnowSystem from './components/SnowSystem';
import FireworkSystem from './components/FireworkSystem';
import Atmosphere from './components/Atmosphere';
import UIOverlay from './components/UIOverlay';
import HandGestureHandler from './components/HandGestureHandler';
import OpeningPage from './components/OpeningPage';
import EnergyPulseStage from './components/EnergyPulseStage';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [displayMode, setDisplayMode] = useState<'TREE' | 'EXPLODE'>('TREE');
  const [isSnowing, setIsSnowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [wishCount, setWishCount] = useState(0);

  const rotationOffsetRef = useRef(0);
  const cursorRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chimeRef = useRef<HTMLAudioElement | null>(null);
  
  const mouseDownTime = useRef(0);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  // 初始化音频实例
  useEffect(() => {
    const bgm = new Audio();
    bgm.src = 'https://assets.mixkit.co/music/preview/mixkit-christmas-dream-531.mp3';
    bgm.loop = true;
    bgm.volume = 0.4;
    bgm.crossOrigin = 'anonymous';
    bgm.preload = 'auto';
    audioRef.current = bgm;

    const chime = new Audio();
    chime.src = 'https://assets.mixkit.co/sfx/preview/mixkit-magical-light-sparkle-802.mp3';
    chime.volume = 0.3;
    chime.crossOrigin = 'anonymous';
    chime.preload = 'auto';
    chimeRef.current = chime;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // 响应静音状态
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (chimeRef.current) chimeRef.current.muted = isMuted;
  }, [isMuted]);

  // 处理开始按钮点击（这是移动端解锁音频的关键交互）
  const handleStart = async () => {
    // 1. 解锁音频
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => console.log("BGM started"))
        .catch(err => console.warn("Audio play failed:", err));
    }

    // 2. 预请求摄像头权限
    // 在用户点击事件中直接请求权限，可以极大提高在 iOS/Android 上的成功率
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // 只是为了触发权限弹窗，拿到后先关掉，后续由 HandGestureHandler 接管
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Initial camera permission request failed or denied:", err);
      }
    }

    setIsStarted(true);
  };

  const handleMakeWish = () => {
    setWishCount(prev => prev + 1);
    if (chimeRef.current) {
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(e => console.warn("Chime blocked", e));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isStarted) return;
    mouseDownTime.current = performance.now();
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isStarted) return;
    const duration = performance.now() - mouseDownTime.current;
    const dist = Math.hypot(e.clientX - mouseDownPos.current.x, e.clientY - mouseDownPos.current.y);
    // 快速点击切换模式
    if (duration < 250 && dist < 10) {
      setDisplayMode(prev => prev === 'TREE' ? 'EXPLODE' : 'TREE');
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] bg-[#05020a] overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {!isStarted && <OpeningPage onStart={handleStart} />}

      <div 
        ref={cursorRef}
        className="hand-cursor will-change-transform"
        style={{ opacity: 0 }}
      >
        <div className="cursor-dot" />
        <div className="cursor-ring" />
      </div>

      <HandGestureHandler 
        onGestureChange={setDisplayMode} 
        rotationRef={rotationOffsetRef}
        cursorRef={cursorRef}
        active={isStarted}
      />

      <Canvas shadows gl={{ antialias: false, stencil: false, depth: true }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 10, 24]} fov={45} />
          
          <OrbitControls 
            enablePan={false} 
            enableDamping={true} 
            dampingFactor={0.05}
            minDistance={15} 
            maxDistance={45}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 6}
            target={[0, 0, 0]}
          />
          
          <Environment preset="city" />
          
          <ambientLight intensity={0.2} />
          <spotLight position={[15, 20, 10]} angle={0.3} penumbra={1} intensity={25} color="#FF69B4" castShadow />
          <pointLight position={[0, -2, 0]} intensity={15} color="#8A2BE2" />
          
          <ChristmasTree mode={displayMode} rotationRef={rotationOffsetRef} />
          <EnergyPulseStage active={displayMode === 'TREE'} />
          
          <SnowSystem active={isSnowing} />
          <FireworkSystem triggerCount={wishCount} />
          <Atmosphere />

          <EffectComposer multisampling={0}>
            <Bloom intensity={0.8} luminanceThreshold={0.2} luminanceSmoothing={0.9} radius={0.5} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <Noise opacity={0.04} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {isStarted && (
        <UIOverlay 
          isSnowing={isSnowing} 
          onToggleSnow={() => setIsSnowing(!isSnowing)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          onMakeWish={handleMakeWish}
          cursorRef={cursorRef}
          displayMode={displayMode}
        />
      )}
    </div>
  );
};

export default App;
