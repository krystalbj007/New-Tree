
import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandGestureHandlerProps {
  onGestureChange: (mode: 'TREE' | 'EXPLODE') => void;
  rotationRef: React.MutableRefObject<number>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
}

const HandGestureHandler: React.FC<HandGestureHandlerProps> = ({ 
  onGestureChange, 
  rotationRef,
  cursorRef,
  active
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const isComponentMounted = useRef(true);
  const isInitializing = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  
  const smoothedX = useRef(0);
  const smoothedY = useRef(0);
  const lastHandX = useRef<number | null>(null);
  const lastGesture = useRef<'TREE' | 'EXPLODE' | null>(null);
  const lostTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 稳定性优化变量
  const gestureStabilityCount = useRef(0);
  const pendingGesture = useRef<'TREE' | 'EXPLODE' | null>(null);
  const STABILITY_THRESHOLD = 6; 
  const MAX_ROTATION_DELTA = 0.8; 
  const lerpFactor = 0.25; 

  useEffect(() => {
    isComponentMounted.current = true;
    if (!active || isInitializing.current || handLandmarkerRef.current) return;

    // 拦截无意义的控制台信息
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('XNNPACK delegate')) return;
      originalInfo(...args);
    };

    const initMediaPipe = async () => {
      isInitializing.current = true;
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        if (!isComponentMounted.current) return;
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        handLandmarkerRef.current = landmarker;
        await startCamera();
      } catch (e) {
        console.warn("MediaPipe init fallback", e);
      } finally {
        isInitializing.current = false;
      }
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("getUserMedia not supported");
        return;
      }
      try {
        // 更加兼容的约束条件
        const constraints = {
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            facingMode: "user" 
          },
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current && isComponentMounted.current) {
          videoRef.current.srcObject = stream;
          // 明确设置属性
          videoRef.current.setAttribute('playsinline', '');
          videoRef.current.muted = true;
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                animationFrameRef.current = requestAnimationFrame(predictWebcam);
              }).catch(err => console.error("Video play failed:", err));
            }
          };
        }
      } catch (err) {
        console.error("Camera access failed:", err);
      }
    };

    initMediaPipe();

    return () => {
      isComponentMounted.current = false;
      console.info = originalInfo;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (lostTrackingTimeoutRef.current) clearTimeout(lostTrackingTimeoutRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [active]);

  const predictWebcam = async () => {
    if (!videoRef.current || !handLandmarkerRef.current || videoRef.current.readyState < 2 || !isComponentMounted.current) {
      if (active && isComponentMounted.current) {
        animationFrameRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    try {
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        // 恢复追踪
        if (lostTrackingTimeoutRef.current) {
          clearTimeout(lostTrackingTimeoutRef.current);
          lostTrackingTimeoutRef.current = null;
        }

        const landmarks = results.landmarks[0];
        const targetX = (1 - landmarks[9].x) * window.innerWidth;
        const targetY = landmarks[9].y * window.innerHeight;
        
        smoothedX.current += (targetX - smoothedX.current) * lerpFactor;
        smoothedY.current += (targetY - smoothedY.current) * lerpFactor;

        // 手势判定
        const tips = [8, 12, 16, 20];
        const mcps = [5, 9, 13, 17];
        let foldedFingers = 0;
        for(let i=0; i<tips.length; i++) {
          const distTipWrist = Math.hypot(landmarks[tips[i]].x - landmarks[0].x, landmarks[tips[i]].y - landmarks[0].y);
          const distMcpWrist = Math.hypot(landmarks[mcps[i]].x - landmarks[0].x, landmarks[mcps[i]].y - landmarks[0].y);
          if (distTipWrist < distMcpWrist) foldedFingers++;
        }

        const isGrabbing = foldedFingers >= 3; 
        const currentFrameGesture: 'TREE' | 'EXPLODE' = isGrabbing ? 'TREE' : 'EXPLODE';

        // 稳定性判定
        if (currentFrameGesture !== lastGesture.current) {
          if (currentFrameGesture === pendingGesture.current) {
            gestureStabilityCount.current++;
            if (gestureStabilityCount.current >= STABILITY_THRESHOLD) {
              onGestureChange(currentFrameGesture);
              lastGesture.current = currentFrameGesture;
              gestureStabilityCount.current = 0;
            }
          } else {
            pendingGesture.current = currentFrameGesture;
            gestureStabilityCount.current = 0;
          }
        } else {
          gestureStabilityCount.current = 0;
          pendingGesture.current = null;
        }

        // 游标更新
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${smoothedX.current}px, ${smoothedY.current}px, 0) translate(-50%, -50%)`;
          cursorRef.current.style.opacity = '1';
          if (isGrabbing) cursorRef.current.classList.add('grabbing');
          else cursorRef.current.classList.remove('grabbing');
        }

        // 旋转平滑控制
        if (!isGrabbing) {
          if (lastHandX.current !== null) {
            let deltaX = (landmarks[9].x - lastHandX.current) * -25;
            deltaX = Math.max(-MAX_ROTATION_DELTA, Math.min(MAX_ROTATION_DELTA, deltaX));
            rotationRef.current += deltaX;
          }
          lastHandX.current = landmarks[9].x;
        } else {
          lastHandX.current = null;
        }
      } else {
        // 追踪丢失
        if (cursorRef.current) cursorRef.current.style.opacity = '0';
        lastHandX.current = null;
        gestureStabilityCount.current = 0;

        if (lastGesture.current !== 'TREE' && !lostTrackingTimeoutRef.current) {
          lostTrackingTimeoutRef.current = setTimeout(() => {
            if (isComponentMounted.current) {
              onGestureChange('TREE');
              lastGesture.current = 'TREE';
              lostTrackingTimeoutRef.current = null;
            }
          }, 500);
        }
      }
    } catch (err) {
      // 捕获偶发性内部计算错误
    }

    if (active && isComponentMounted.current) {
      animationFrameRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '1px', 
        height: '1px', 
        opacity: 0, 
        pointerEvents: 'none',
        zIndex: -1 
      }} 
    />
  );
};

export default HandGestureHandler;
