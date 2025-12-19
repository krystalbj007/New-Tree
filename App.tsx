
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
import bgmMusic from './assets/music/黑鸭子 - 铃儿响叮当(英).mp3';
import chimeSound from './assets/sfx/sparkle.mp3';

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

  // 初始化音频实例和检查WebGL支持
  useEffect(() => {
    // 检查WebGL支持（移动端可能不支持）
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) {
      console.warn('WebGL is not supported on this device');
      alert('您的设备不支持WebGL，无法显示3D效果。请使用支持WebGL的浏览器。');
    }

    const bgm = new Audio();
    bgm.src = bgmMusic;
    bgm.loop = true;
    bgm.volume = 0.4;
    bgm.preload = 'auto';
    audioRef.current = bgm;

    const chime = new Audio();
    chime.src = chimeSound;
    chime.volume = 0.3;
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecure && isMobile) {
      console.warn("Camera access requires HTTPS on mobile devices");
      alert('⚠️ 移动端访问摄像头需要HTTPS连接。\n\n如果您在本地开发，请使用 localhost 访问。\n如果部署到服务器，请确保使用 HTTPS。');
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        console.log("Requesting camera permission...");
        // 移动端使用更宽松的约束条件
        const constraints = isMobile 
          ? { video: { facingMode: 'user' } } // 移动端只指定前置摄像头
          : { 
              video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
              } 
            };
        
        // 尝试获取媒体流
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr: any) {
          // 如果第一次失败，尝试最宽松的条件（不指定 facingMode）
          console.warn("First camera attempt failed, trying relaxed constraints:", firstErr);
          if (isMobile && (firstErr.name === 'OverconstrainedError' || firstErr.name === 'NotFoundError')) {
             stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } else {
            throw firstErr;
          }
        }

        console.log("Camera permission granted!");
        // 只是为了触发权限弹窗，拿到后先关掉，后续由 HandGestureHandler 接管
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        console.error("Camera permission request failed:", err);
        // 如果权限被拒绝，仍然继续，但提示用户
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          const message = isMobile
            ? '摄像头权限被拒绝。\n\n请在浏览器设置中允许摄像头访问：\n1. 点击地址栏左侧的锁图标\n2. 选择"网站设置"\n3. 将"摄像头"设置为"允许"\n4. 刷新页面'
            : '摄像头权限被拒绝。请在浏览器设置中允许摄像头访问，然后刷新页面。\n\nChrome: 点击地址栏左侧的锁图标 > 网站设置 > 摄像头 > 允许';
          alert(message);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          alert('未检测到摄像头设备。请确保摄像头已连接并正常工作。');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          alert('摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试。');
        } else {
          console.warn("Camera access error:", err);
          if (isMobile) {
            alert(`摄像头访问失败: ${err.message || err.name}\n\n请确保：\n1. 使用HTTPS连接\n2. 允许摄像头权限\n3. 摄像头未被其他应用占用`);
          }
        }
      }
    } else {
      console.warn("getUserMedia is not supported in this browser");
      if (isMobile) {
        alert('您的浏览器不支持摄像头访问。请使用Chrome、Safari或Firefox等现代浏览器。');
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

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

      <Canvas 
        shadows={!isMobile}
        gl={{ 
          antialias: false, 
          stencil: false, 
          depth: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false
        }} 
        dpr={typeof window !== 'undefined' ? (isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2)) : 1}
        camera={{ position: [0, 10, 24], fov: 45 }}
        performance={{ min: 0.5 }}
      >
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
          
          <Environment files="/hdr/potsdamer_platz_1k.hdr" />
          
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
